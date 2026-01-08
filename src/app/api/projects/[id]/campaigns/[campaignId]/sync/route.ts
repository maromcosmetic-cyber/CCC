// Sync campaign insights API

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/db/client';
import { logAuditEvent } from '@/lib/audit/logger';
import { MetaApi } from '@/lib/providers/meta/MetaApi';
import { GoogleAdsApi } from '@/lib/providers/google-ads/GoogleAdsApi';
import { LazadaApi } from '@/lib/providers/lazada/LazadaApi';
import { TikTokApi } from '@/lib/providers/tiktok/TikTokApi';
import { getIntegrationCredentials } from '@/lib/integrations/manager';
import { format, subDays } from 'date-fns';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; campaignId: string } }
) {
  try {
    const { id: projectId, campaignId } = params;

    const { data: campaign } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', campaignId)
      .eq('project_id', projectId)
      .single();

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    // Get user's API credentials for this platform
    const credentials = await getIntegrationCredentials(projectId, campaign.platform);
    
    if (!credentials) {
      return NextResponse.json(
        { error: `No API credentials configured for ${campaign.platform}. Please configure your API keys in Control System > Integrations.` },
        { status: 400 }
      );
    }
    
    // Get provider with user credentials
    let provider;
    switch (campaign.platform) {
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

    if (!campaign.external_campaign_id) {
      return NextResponse.json({ error: 'Campaign not synced to platform' }, { status: 400 });
    }

    // Fetch insights from platform
    const dateRange = {
      start_date: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
      end_date: format(new Date(), 'yyyy-MM-dd'),
    };

    // TODO: Replace stub with actual API call
    const insights = await provider.getInsights(campaign.external_campaign_id, dateRange);

    // Update campaign with latest insights
    const { data: updatedCampaign, error } = await supabase
      .from('campaigns')
      .update({
        insights_data: insights,
        last_synced_at: new Date().toISOString(),
      })
      .eq('id', campaignId)
      .select()
      .single();

    if (error || !updatedCampaign) {
      return NextResponse.json({ error: error?.message || 'Failed to sync campaign' }, { status: 500 });
    }

    await logAuditEvent({
      event_type: 'campaign_synced',
      actor_type: 'user',
      source: 'ui',
      project_id: projectId,
      payload: { campaign_id: campaignId },
    });

    return NextResponse.json({
      success: true,
      insights_data: insights,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

