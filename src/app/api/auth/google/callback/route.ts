import { NextRequest, NextResponse } from 'next/server';
import { upsertIntegration } from '@/lib/integrations/manager';

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const code = searchParams.get('code');
        const state = searchParams.get('state'); // Contains projectId
        const error = searchParams.get('error');

        if (error) {
            return NextResponse.redirect(
                new URL(`/settings/integrations?error=${encodeURIComponent(error)}`, request.url)
            );
        }

        if (!code || !state) {
            return NextResponse.redirect(
                new URL('/settings/integrations?error=missing_parameters', request.url)
            );
        }

        const projectId = state;

        // Exchange authorization code for access token
        const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                code,
                client_id: process.env.GOOGLE_BUSINESS_CLIENT_ID || '',
                client_secret: process.env.GOOGLE_BUSINESS_CLIENT_SECRET || '',
                redirect_uri: `${new URL(request.url).origin}/api/auth/google/callback`,
                grant_type: 'authorization_code',
            }),
        });

        if (!tokenResponse.ok) {
            const errorData = await tokenResponse.text();
            console.error('Token exchange failed:', errorData);
            return NextResponse.redirect(
                new URL('/settings/integrations?error=token_exchange_failed', request.url)
            );
        }

        const tokens = await tokenResponse.json();

        // Calculate token expiration time
        const expiresAt = Date.now() + (tokens.expires_in * 1000);

        // Get location ID from Google Business API
        const locationId = await getGoogleBusinessLocationId(tokens.access_token);

        if (!locationId) {
            return NextResponse.redirect(
                new URL('/settings/integrations?error=no_location_found', request.url)
            );
        }

        // Store tokens and location ID in integration
        await upsertIntegration({
            project_id: projectId,
            provider_type: 'google_business',
            credentials: {
                access_token: tokens.access_token,
                refresh_token: tokens.refresh_token,
                location_id: locationId,
                expires_at: expiresAt,
            },
            config: {
                location_id: locationId,
            },
        });

        // Redirect back to integrations page with success message
        return NextResponse.redirect(
            new URL('/settings/integrations?success=google_business_connected', request.url)
        );
    } catch (error) {
        console.error('OAuth callback error:', error);
        return NextResponse.redirect(
            new URL('/settings/integrations?error=unknown_error', request.url)
        );
    }
}

async function getGoogleBusinessLocationId(accessToken: string): Promise<string | null> {
    try {
        // Get accounts
        const accountsResponse = await fetch('https://mybusinessaccountmanagement.googleapis.com/v1/accounts', {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
            },
        });

        if (!accountsResponse.ok) {
            console.error('Failed to fetch accounts');
            return null;
        }

        const accountsData = await accountsResponse.json();
        const accounts = accountsData.accounts || [];

        if (accounts.length === 0) {
            console.error('No Google Business accounts found');
            return null;
        }

        // Get first account's locations
        const accountName = accounts[0].name;
        const locationsResponse = await fetch(
            `https://mybusinessbusinessinformation.googleapis.com/v1/${accountName}/locations`,
            {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                },
            }
        );

        if (!locationsResponse.ok) {
            console.error('Failed to fetch locations');
            return null;
        }

        const locationsData = await locationsResponse.json();
        const locations = locationsData.locations || [];

        if (locations.length === 0) {
            console.error('No locations found');
            return null;
        }

        // Extract location ID from the first location's name
        // Format: accounts/{account_id}/locations/{location_id}
        const locationName = locations[0].name;
        const locationId = locationName.split('/').pop();

        return locationId || null;
    } catch (error) {
        console.error('Error fetching location ID:', error);
        return null;
    }
}
