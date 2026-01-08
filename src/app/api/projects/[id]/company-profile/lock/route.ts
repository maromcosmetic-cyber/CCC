// Lock company profile API

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/db/client';
import { logAuditEvent } from '@/lib/audit/logger';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const projectId = params.id;
    const body = await request.json();
    const companyProfileId = body.company_profile_id;

    // TODO: Get authenticated user
    const userId = '00000000-0000-0000-0000-000000000001'; // Mock

    // Get company profile (or latest if not specified)
    let profile;
    if (companyProfileId) {
      const { data } = await supabase
        .from('company_profiles')
        .select('*')
        .eq('id', companyProfileId)
        .eq('project_id', projectId)
        .single();
      profile = data;
    } else {
      const { data } = await supabase
        .from('company_profiles')
        .select('*')
        .eq('project_id', projectId)
        .order('version', { ascending: false })
        .limit(1)
        .single();
      profile = data;
    }

    if (!profile) {
      return NextResponse.json({ error: 'Company profile not found' }, { status: 404 });
    }

    // Lock the profile
    const { data: lockedProfile, error } = await supabase
      .from('company_profiles')
      .update({
        locked_at: new Date().toISOString(),
        locked_by: userId,
      })
      .eq('id', profile.id)
      .select()
      .single();

    if (error || !lockedProfile) {
      return NextResponse.json({ error: error?.message || 'Failed to lock profile' }, { status: 500 });
    }

    await logAuditEvent({
      event_type: 'company_profile_locked',
      actor_id: userId,
      actor_type: 'user',
      source: 'ui',
      project_id: projectId,
      payload: {
        company_profile_id: lockedProfile.id,
        version: lockedProfile.version,
      },
    });

    return NextResponse.json({
      company_profile: {
        id: lockedProfile.id,
        version: lockedProfile.version,
        locked_at: lockedProfile.locked_at,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


