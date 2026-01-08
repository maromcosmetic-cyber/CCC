import { getIntegrationCredentials } from './manager';

const GOOGLE_BUSINESS_API_BASE = 'https://mybusiness.googleapis.com/v4';

export interface GoogleReview {
    reviewId: string;
    reviewer: {
        profilePhotoUrl?: string;
        displayName: string;
        isAnonymous: boolean;
    };
    starRating: 'ONE' | 'TWO' | 'THREE' | 'FOUR' | 'FIVE';
    comment?: string;
    createTime: string;
    updateTime: string;
    reviewReply?: {
        comment: string;
        updateTime: string;
    };
    name: string; // Full resource name
}

export interface GoogleBusinessCredentials {
    access_token: string;
    refresh_token?: string;
    location_id: string;
    expires_at?: number;
}

/**
 * Fetch reviews from Google Business Profile
 */
export async function fetchGoogleReviews(
    projectId: string,
    pageSize: number = 50
): Promise<GoogleReview[] | null> {
    try {
        const credentials = await getIntegrationCredentials(projectId, 'google_business');

        if (!credentials || !credentials.access_token || !credentials.location_id) {
            console.warn('Google Business credentials missing');
            return null;
        }

        const { access_token, location_id } = credentials as unknown as GoogleBusinessCredentials;

        // Check if token is expired and needs refresh
        if (credentials.expires_at && typeof credentials.expires_at === 'number' && Date.now() > credentials.expires_at) {
            // TODO: Implement token refresh
            console.warn('Access token expired, needs refresh');
            return null;
        }

        const response = await fetch(
            `${GOOGLE_BUSINESS_API_BASE}/accounts/${location_id}/locations/${location_id}/reviews?pageSize=${pageSize}`,
            {
                headers: {
                    'Authorization': `Bearer ${access_token}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`Google Business API Error (${response.status}):`, errorText);
            return null;
        }

        const data = await response.json();
        return data.reviews || [];
    } catch (error) {
        console.error('Error fetching Google reviews:', error);
        return null;
    }
}

/**
 * Reply to a Google Business review
 */
export async function replyToGoogleReview(
    projectId: string,
    reviewName: string,
    replyText: string
): Promise<boolean> {
    try {
        const credentials = await getIntegrationCredentials(projectId, 'google_business');

        if (!credentials || !credentials.access_token) {
            console.warn('Google Business credentials missing');
            return false;
        }

        const { access_token } = credentials as unknown as GoogleBusinessCredentials;

        const response = await fetch(
            `${GOOGLE_BUSINESS_API_BASE}/${reviewName}/reply`,
            {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${access_token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    comment: replyText,
                }),
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`Failed to reply to review (${response.status}):`, errorText);
            return false;
        }

        return true;
    } catch (error) {
        console.error('Error replying to Google review:', error);
        return false;
    }
}

/**
 * Convert star rating enum to number
 */
export function starRatingToNumber(rating: GoogleReview['starRating']): number {
    const map = {
        'ONE': 1,
        'TWO': 2,
        'THREE': 3,
        'FOUR': 4,
        'FIVE': 5,
    };
    return map[rating] || 0;
}
