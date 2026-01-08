// Calendar generation worker job handler

import { CalendarJobData } from '../queue/jobs';
import { KieAIProvider } from '../providers/kie/KieAIProvider';
import { supabaseAdmin } from '../db/client';
import { logAuditEvent } from '../audit/logger';
import { logCost } from '../costs/tracker';
import { getTemplate } from '../prompts/templates';
import { renderTemplate } from '../prompts/render';
import { addDays, format } from 'date-fns';

export async function generateCalendarJob(data: CalendarJobData): Promise<void> {
  const { project_id, strategy_version_id, weeks = 4, target_version } = data;

  try {
    // Get strategy
    const { data: strategy } = await supabaseAdmin
      ?.from('strategies')
      .select('*')
      .eq('id', strategy_version_id)
      .single();

    if (!strategy) {
      throw new Error('Strategy not found');
    }

    // Get presenters
    const { data: presenters } = await supabaseAdmin
      ?.from('presenters')
      .select('*')
      .eq('project_id', project_id)
      .order('created_at', { ascending: false });

    // Get prompt template
    const template = getTemplate('CALENDAR_GENERATION_4W');
    if (!template) {
      throw new Error('Calendar template not found');
    }

    const startDate = new Date();
    const startDateStr = format(startDate, 'yyyy-MM-dd');

    // Render prompt
    const prompt = renderTemplate(template, {
      strategy: JSON.stringify(strategy.strategy_data, null, 2),
      weeks: weeks.toString(),
      start_date: startDateStr,
      presenters: JSON.stringify(presenters || [], null, 2),
    });

    // LLM is platform-managed - uses Kie AI unified gateway
    const llm = new KieAIProvider();
    const response = await llm.generate(prompt, {
      json_schema: template.json_schema,
    });

    if (!response.structured || !response.structured.posts) {
      throw new Error('Failed to generate calendar posts');
    }

    // Get next version number
    const { data: existingCalendars } = await supabaseAdmin
      ?.from('calendar_versions')
      .select('version')
      .eq('project_id', project_id)
      .order('version', { ascending: false })
      .limit(1);

    const nextVersion = existingCalendars && existingCalendars.length > 0
      ? existingCalendars[0].version + 1
      : 1;

    // Create calendar version
    const { data: calendarVersion, error: calendarError } = await supabaseAdmin
      ?.from('calendar_versions')
      .insert({
        project_id,
        version: nextVersion,
        strategy_version_id: strategy.id,
        weeks,
        start_date: startDateStr,
      })
      .select()
      .single();

    if (calendarError || !calendarVersion) {
      throw new Error(`Failed to create calendar version: ${calendarError?.message}`);
    }

    // Create calendar posts
    const posts = response.structured.posts;
    const createdPosts = [];

    for (const post of posts) {
      const { data: calendarPost, error: postError } = await supabaseAdmin
        ?.from('calendar_posts')
        .insert({
          calendar_version_id: calendarVersion.id,
          channel: post.channel,
          scheduled_date: post.scheduled_date,
          presenter_id: post.presenter_id || (presenters?.[0]?.id),
          post_data: {
            copy: post.copy,
            brief: post.brief,
            assets: post.asset_requirements || {},
          },
          status: 'draft',
        })
        .select()
        .single();

      if (calendarPost) {
        createdPosts.push(calendarPost);
      }

      if (postError) {
        console.error('Failed to create calendar post:', postError);
      }
    }

    // Log audit event
    await logAuditEvent({
      event_type: 'calendar_generated',
      actor_type: 'worker',
      source: 'worker',
      project_id,
      payload: {
        calendar_version_id: calendarVersion.id,
        posts_count: createdPosts.length,
      },
    });

    // Log cost
    const cost = llm.estimateCost(response.tokens_used?.total || 0);
    await logCost({
      project_id,
      provider_type: 'llm',
      cost_amount: cost,
      cost_currency: 'USD',
      metadata: {
        tokens: response.tokens_used?.total || 0,
        model: response.model,
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    await logAuditEvent({
      event_type: 'calendar_generation_failed',
      actor_type: 'worker',
      source: 'worker',
      project_id,
      payload: {
        strategy_version_id,
        error: errorMessage,
      },
    });

    throw error;
  }
}

