// Campaign detail API routes

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/db/client';
import { UpdateCampaignSchema } from '@/lib/validation/schemas';
import { logAuditEvent } from '@/lib/audit/logger';
import { MetaApi } from '@/lib/providers/meta/MetaApi';
import { GoogleAdsApi } from '@/lib/providers/google-ads/GoogleAdsApi';
import { LazadaApi } from '@/lib/providers/lazada/LazadaApi';
import { TikTokApi } from '@/lib/providers/tiktok/TikTokApi';
import { getIntegrationCredentials } from '@/lib/integrations/manager';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; campaignId: string } }
) {
  try {
    const { id: projectId, campaignId } = params;

    const { data: campaignData, error } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', campaignId)
      .eq('project_id', projectId)
      .single();

    const campaign = campaignData as any;

    if (error || !campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    // Get user's API credentials for this platform
    const credentials = await getIntegrationCredentials(projectId, campaign.platform);

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
    }

    let insights = campaign.insights_data;
    if (provider && campaign.external_campaign_id) {
      // TODO: Replace stub with actual API call
      try {
        const campaignDetails = await provider.getCampaign(campaign.external_campaign_id);
        insights = campaignDetails.insights || campaign.insights_data;
      } catch (error) {
        // Use existing insights if API call fails
      }
    }

    return NextResponse.json({
      campaign: {
        id: campaign.id,
        name: campaign.name,
        platform: campaign.platform,
        status: campaign.status,
        insights_data: insights,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; campaignId: string } }
) {
  try {
    const { id: projectId, campaignId } = params;
    const body = await request.json();
    const validated = UpdateCampaignSchema.partial().parse(body);

    const { data: campaignData } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', campaignId)
      .eq('project_id', projectId)
      .single();

    const campaign = campaignData as any;

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    // Get user's API credentials for this platform
    const credentials = await getIntegrationCredentials(projectId, campaign.platform);

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
    }

    if (provider && campaign.external_campaign_id) {
      // TODO: Replace stub with actual API call
      await provider.updateCampaign(campaign.external_campaign_id, validated);
    }

    // Update local record
    const { data: updatedCampaign, error } = await supabase
      .from('campaigns')
      // @ts-ignore
      .update(validated)
      .eq('id', campaignId)
      .select()
      .single();

    if (error || !updatedCampaign) {
      return NextResponse.json({ error: error?.message || 'Failed to update campaign' }, { status: 500 });
    }

    await logAuditEvent({
      event_type: 'campaign_updated',
      actor_type: 'user',
      source: 'ui',
      project_id: projectId,
      payload: { campaign_id: campaignId },
    });

    return NextResponse.json({ campaign: updatedCampaign });
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({ error: 'Validation error' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; campaignId: string } }
) {
  try {
    const { id: projectId, campaignId } = params;

    const { data: campaignData } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', campaignId)
      .eq('project_id', projectId)
      .single();

    const campaign = campaignData as any;

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    // Get user's API credentials for this platform
    const credentials = await getIntegrationCredentials(projectId, campaign.platform);

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
    }

    if (provider && campaign.external_campaign_id) {
      // TODO: Replace stub with actual API call
      await provider.deleteCampaign(campaign.external_campaign_id);
    }

    // Delete local record
    const { error } = await supabase
      .from('campaigns')
      .delete()
      .eq('id', campaignId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await logAuditEvent({
      event_type: 'campaign_deleted',
      actor_type: 'user',
      source: 'ui',
      project_id: projectId,
      payload: { campaign_id: campaignId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

