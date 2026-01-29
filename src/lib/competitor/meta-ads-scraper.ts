/**
 * Meta Ad Library Scraper
 * Fetches competitor advertising data from Meta Ad Library API
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import { createServiceRoleClient } from '@/lib/auth/server';

const META_API_VERSION = 'v19.0'; // Updated to v19.0 for better stability
const META_API_BASE = `https://graph.facebook.com/${META_API_VERSION}`;

export interface MetaAd {
    id: string;
    ad_creative_bodies?: string[];
    ad_creative_link_titles?: string[];
    ad_snapshot_url?: string;
    page_name?: string;
    publisher_platforms?: string[];
    spend?: {
        lower_bound: string;
        upper_bound: string;
    };
    impressions?: {
        lower_bound: string;
        upper_bound: string;
    };
    ad_delivery_start_time?: string;
    ad_delivery_stop_time?: string;
    languages?: string[];
}

export interface MetaAdIntelligence {
    has_active_ads: boolean;
    total_ads_found: number;
    ad_platforms: string[];
    ad_copy_themes: string[]; // Extracted from bodies
    common_headlines: string[];
    cta_strategies: string[]; // Inferred
    estimated_monthly_spend: string;
    ad_creative_styles: string[]; // Inferred from media type if available
    target_languages: string[];
    ad_frequency: string;
    sample_ad_urls: string[];
    competitive_advantage: string;
    raw_ads?: MetaAd[]; // Keep raw data for UI
}

async function getMetaAccessToken(projectId: string): Promise<string | null> {
    try {
        console.log(`🔑 Getting Meta Token for project: ${projectId}`);
        const supabase = createServiceRoleClient();

        // 1. Get Integration for that Project
        const { data: integration, error: dbError } = await supabase
            .from('integrations')
            .select('credentials_encrypted, status, provider_type')
            .eq('project_id', projectId)
            .in('provider_type', ['meta', 'facebook_ads', 'meta_ads'])
            .eq('status', 'active')
            .single();

        if (dbError) {
            console.error('❌ DB Error fetching integration:', dbError);
            return null;
        }

        if (!integration) {
            console.warn('⚠️ No active Meta integration found for this project.');
            return null;
        }

        if (!integration.credentials_encrypted) {
            console.error('❌ Integration found but no credentials_encrypted data.');
            return null;
        }

        console.log('📦 Found integration:', integration.provider_type);

        // 3. Decrypt
        try {
            const { decryptCredentials } = await import('@/lib/encryption/credentials');
            const credentials = decryptCredentials(integration.credentials_encrypted) as any;

            const token = credentials.access_token || credentials.meta_access_token;
            if (!token) {
                console.error('❌ Decrypted credentials missing access_token field.');
                return null;
            }

            console.log('✅ Token decrypted successfully (length: ' + token.length + ')');
            return token;
        } catch (decryptError) {
            console.error('❌ Decryption failed:', decryptError);
            return null;
        }
    } catch (error) {
        console.error('❌ Error in getMetaAccessToken:', error);
        return null;
    }
}

export async function fetchCompetitorAds(websiteUrl: string, projectId: string): Promise<MetaAdIntelligence | null> {
    try {
        const accessToken = await getMetaAccessToken(projectId);

        if (!accessToken) {
            console.log('⚠️ No Meta integration configured. Skipping ad analysis.');
            return null;
        }

        console.log(`📢 Fetching Meta ads for ${websiteUrl}`);

        // clean url to getting domain name for search_terms
        // e.g. https://www.example.com/foo -> example.com
        let domain = websiteUrl.replace(/^https?:\/\//, '').replace(/^www\./, '');
        if (domain.includes('/')) {
            domain = domain.split('/')[0];
        }

        // Search parameters
        const searchParams = new URLSearchParams({
            access_token: accessToken,
            search_terms: domain,
            ad_type: 'ALL',
            ad_active_status: 'ACTIVE',
            // 'ad_active_status' is required.
            // 'ad_reached_countries' is REQUIRED when 'search_page_ids' is not provided.
            // We cannot simply say "ALL", so we include the top global advertising markets.
            ad_reached_countries: JSON.stringify([
                'US', 'CA', 'GB', 'AU', 'IE', 'NZ', // Anglosphere
                'IL', // Israel (User Context)
                'DE', 'FR', 'IT', 'ES', 'NL', 'SE', 'NO', 'DK', 'FI', 'CH', 'BE', 'AT', 'PT', // Europe
                'BR', 'MX', 'AR', 'CO', 'CL', 'PE', // LatAm
                'IN', 'JP', 'KR', 'SG', 'ID', 'TH', 'VN', 'MY', 'PH', // Asia
                'ZA', 'NG', 'EG', // Africa
                'AE', 'SA', 'TR' // Middle East
            ]),
            fields: 'id,ad_creative_bodies,ad_creative_link_titles,ad_snapshot_url,page_name,publisher_platforms,languages,ad_delivery_start_time',
            limit: '50'
        });

        const response = await fetch(`${META_API_BASE}/ads_archive?${searchParams.toString()}`);

        if (!response.ok) {
            const error = await response.json();

            // RETRY LOGIC: If "Unknown Error", try with reduced country list
            // This happens if the user doesn't have permission for Global search or the list is too long
            if (error.error?.message === 'An unknown error has occurred') {
                console.warn('⚠️ Encountered "Unknown Error" with global list. Retrying with US-only (fallback)...');

                const retryParams = new URLSearchParams({
                    access_token: accessToken,
                    search_terms: domain,
                    ad_type: 'ALL',
                    ad_active_status: 'ACTIVE',
                    ad_reached_countries: JSON.stringify(['US']), // Minimal list
                    fields: 'id,ad_creative_bodies,ad_creative_link_titles,ad_snapshot_url,page_name,publisher_platforms,languages,ad_delivery_start_time',
                    limit: '50'
                });

                const retryResponse = await fetch(`${META_API_BASE}/ads_archive?${retryParams.toString()}`);
                if (retryResponse.ok) {
                    console.log('✅ Retry successful with US-only list!');
                    // Use the retry response
                    const data = await retryResponse.json();
                    // Process as normal
                    return processAdsData(data);
                } else {
                    console.error('❌ Retry also failed.');
                    // Fall through to throw original error or new error
                }
            }

            console.error('Meta API Error:', error);
            const apiError = new Error(error.error?.message || 'Failed to fetch ads');
            (apiError as any).type = error.error?.type;
            (apiError as any).code = error.error?.code;
            throw apiError;
        }

        const data = await response.json();
        return processAdsData(data);

    } catch (error: any) {
        console.error(`❌ Error fetching competitor ads for ${websiteUrl}:`, error.message);

        // Specific handling for Ad Library API Permission Error (Identity Confirmation required)
        if (error?.code === 10 || error?.error_subcode === 2332002) {
            return {
                has_active_ads: false,
                total_ads_found: 0,
                ad_platforms: [],
                ad_copy_themes: [],
                common_headlines: [],
                cta_strategies: [],
                estimated_monthly_spend: 'Unknown',
                ad_creative_styles: [],
                target_languages: [],
                ad_frequency: 'Unknown',
                sample_ad_urls: [],
                competitive_advantage: 'Access Denied: You must enable API access at facebook.com/ads/library/api',
                error: 'api_access_required' // New error flag
            } as any;
        }

        // If it's an OAuth error (authentication failed), return a specific error state
        if (error?.type === 'OAuthException' || error?.message?.includes('OAuth')) {
            return {
                has_active_ads: false,
                total_ads_found: 0,
                ad_platforms: [],
                ad_copy_themes: [],
                common_headlines: [],
                cta_strategies: [],
                estimated_monthly_spend: 'Unknown',
                ad_creative_styles: [],
                target_languages: [],
                ad_frequency: 'Unknown',
                sample_ad_urls: [],
                competitive_advantage: 'Integration Error: Your Meta credentials are invalid or expired. Please reconnect in Settings.',
                error: 'auth_failed',
                meta_error_message: error.message // Expose raw error for debugging
            } as any;
        }

        return null;
    }
}

// Helper function to process ads
function processAdsData(data: any): MetaAdIntelligence {
    const ads = data.data as MetaAd[];

    if (!ads || ads.length === 0) {
        return {
            has_active_ads: false,
            total_ads_found: 0,
            ad_platforms: [],
            ad_copy_themes: [],
            common_headlines: [],
            cta_strategies: [],
            estimated_monthly_spend: 'Unknown',
            ad_creative_styles: [],
            target_languages: [],
            ad_frequency: 'Low',
            sample_ad_urls: [],
            competitive_advantage: 'No active ad campaigns detected.'
        };
    }

    // Process found ads
    const platforms = new Set<string>();
    const languages = new Set<string>();
    const bodies: string[] = [];
    const headlines: string[] = [];
    const snapshotUrls: string[] = [];

    ads.forEach(ad => {
        ad.publisher_platforms?.forEach(p => platforms.add(p));
        ad.languages?.forEach(l => languages.add(l));
        if (ad.ad_creative_bodies?.[0]) bodies.push(ad.ad_creative_bodies[0]);
        if (ad.ad_creative_link_titles?.[0]) headlines.push(ad.ad_creative_link_titles[0]);
        if (ad.ad_snapshot_url) snapshotUrls.push(ad.ad_snapshot_url);
    });

    // Simple frequency calc
    const frequency = ads.length > 50 ? 'High' : ads.length > 10 ? 'Medium' : 'Low';

    return {
        has_active_ads: true,
        total_ads_found: ads.length,
        ad_platforms: Array.from(platforms),
        ad_copy_themes: bodies.slice(0, 5), // Top 5 samples
        common_headlines: headlines.slice(0, 5),
        cta_strategies: ['Analyst to infer'], // Placeholder for AI inference later
        estimated_monthly_spend: 'Requires higher perms',
        ad_creative_styles: ['Mixed Media'],
        target_languages: Array.from(languages),
        ad_frequency: frequency,
        sample_ad_urls: snapshotUrls.slice(0, 3),
        competitive_advantage: `Running ${ads.length} active ads across ${Array.from(platforms).join(', ')}`,
        raw_ads: ads.slice(0, 20) // Keep some raw data
    };
}
