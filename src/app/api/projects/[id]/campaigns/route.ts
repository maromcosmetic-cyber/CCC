// Campaigns API routes

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/db/client';
import { CreateCampaignSchema } from '@/lib/validation/schemas';
import { logAuditEvent } from '@/lib/audit/logger';
import { MetaApi } from '@/lib/providers/meta/MetaApi';
import { GoogleAdsApi } from '@/lib/providers/google-ads/GoogleAdsApi';
import { LazadaApi } from '@/lib/providers/lazada/LazadaApi';
import { TikTokApi } from '@/lib/providers/tiktok/TikTokApi';
import { getIntegrationCredentials } from '@/lib/integrations/manager';
import { requireAuth } from '@/lib/auth/middleware';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Require authentication
    const auth = await requireAuth(request);
    if (auth.response) {
      return auth.response;
    }

    const projectId = params.id;
    const searchParams = request.nextUrl.searchParams;
    const platform = searchParams.get('platform');
    const status = searchParams.get('status');

    // RLS will ensure user can only access their own projects' campaigns
    let query = supabase
      .from('campaigns')
      .select('*')
      .eq('project_id', projectId);

    if (platform) {
      query = query.eq('platform', platform);
    }

    if (status) {
      query = query.eq('status', status);
    }

    const { data: campaigns, error } = await query.order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ campaigns: campaigns || [] });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Require authentication
    const auth = await requireAuth(request);
    if (auth.response) {
      return auth.response;
    }

    const projectId = params.id;
    const body = await request.json();
    const validated = CreateCampaignSchema.parse(body);

    // Verify user owns the project (RLS will also enforce this)
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Get user's API credentials for this platform
    const credentials = await getIntegrationCredentials(projectId, validated.platform);
    
    // Get appropriate provider with user credentials
    let provider;
    switch (validated.platform) {
      case 'meta':
        provider = new MetaApi(credentials as any);
        break;
      case 'google_ads':
        provider = new GoogleAdsApi(credentials as any);
        break;
      case 'lazada':
        provider = new LazadaApi(credentials as any);
        break;
      case 'tiktok':
        provider = new TikTokApi(credentials as any);
        break;
      default:
        return NextResponse.json({ error: 'Invalid platform' }, { status: 400 });
    }
    
    // Check if credentials are configured
    if (!credentials) {
      return NextResponse.json(
        { error: `No API credentials configured for ${validated.platform}. Please configure your API keys in Control System > Integrations.` },
        { status: 400 }
      );
    }

    // TODO: Replace stub with actual API call
    const campaignResult = await provider.createCampaign({
      name: validated.name,
      description: validated.description,
      budget_amount: validated.budget_amount,
      budget_currency: validated.budget_currency || 'USD',
      targeting: validated.targeting_config,
      start_date: validated.start_date,
      end_date: validated.end_date,
    });

    // Create campaign record (RLS will enforce user ownership via project)
    const { data: campaign, error } = await supabase
      .from('campaigns')
      .insert({
        project_id: projectId,
        platform: validated.platform,
        name: validated.name,
        description: validated.description,
        external_campaign_id: campaignResult.external_campaign_id,
        status: campaignResult.status,
        budget_amount: validated.budget_amount,
        budget_currency: validated.budget_currency || 'USD',
        targeting_config: validated.targeting_config,
        product_id: validated.product_id,
        start_date: validated.start_date,
        end_date: validated.end_date,
      })
      .select()
      .single();

    if (error || !campaign) {
      return NextResponse.json({ error: error?.message || 'Failed to create campaign' }, { status: 500 });
    }

    await logAuditEvent({
      event_type: 'campaign_created',
      actor_type: 'user',
      source: 'ui',
      project_id: projectId,
      payload: { campaign_id: campaign.id, platform: validated.platform },
    });

    return NextResponse.json({ campaign_id: campaign.id });
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({ error: 'Validation error' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

