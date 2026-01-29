// System health and control status API

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/db/client';

export async function GET(request: NextRequest) {
  try {
    // Get all integrations and their statuses
    const { data: integrations } = await supabase
      .from('integrations')
      .select('*, integration_status(*)');

    const integrationStatuses = (integrations || []).map((integration) => {
      const status = ((integration as any).integration_status as any)?.[0];
      return {
        provider_type: (integration as any).provider_type,
        status: status?.status || 'unknown',
        message: status?.message,
        last_checked_at: status?.last_checked_at,
      };
    });

    // Determine overall system health
    const hasErrors = integrationStatuses.some((s) => s.status === 'down');
    const hasDegraded = integrationStatuses.some((s) => s.status === 'degraded');
    const systemHealth = hasErrors ? 'down' : hasDegraded ? 'degraded' : 'healthy';

    return NextResponse.json({
      integrations: integrationStatuses,
      system_health: systemHealth,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


