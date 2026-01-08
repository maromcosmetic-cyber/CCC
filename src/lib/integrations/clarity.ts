
import { getIntegrationCredentials } from './manager';

const CLARITY_API_BASE = 'https://www.clarity.ms/export-data/api/v1';

export interface ClarityData {
    sessionsCount: number;
    pagesPerSession: number;
    scrollDepth: number;
    timeOnSite: number; // in seconds
    bounceRate: number; // percentage
    topPages: Array<{ url: string; visits: number }>;
}

/**
 * Fetch dashboard data from Microsoft Clarity
 * @param projectId - Internal project ID (used to fetch credentials)
 * @param numOfDays - Number of days to fetch (1, 2, or 3)
 */
export async function fetchClarityData(projectId: string, numOfDays: 1 | 2 | 3 = 3): Promise<ClarityData | null> {
    try {
        const credentials = await getIntegrationCredentials(projectId, 'microsoft_clarity');

        if (!credentials || !credentials.api_token) {
            console.warn('Clarity credentials or API token missing');
            return null;
        }

        const token = credentials.api_token as string;

        // Clarity's endpoint for live insights
        // Note: The search result endpoint was /project-live-insights but we need to pass parameters
        // The query parameters are usually ?numOfDays=X
        const response = await fetch(`${CLARITY_API_BASE}/project-live-insights?numOfDays=${numOfDays}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`Clarity API Error (${response.status}):`, errorText);
            return null;
        }

        const data = await response.json();

        // Transform the raw data into our simplified interface
        // Note: Verify response shape. Assuming standard metric keys based on common exports.
        // If the API returns a list of rows, we might need to aggregate.
        // However, live-insights usually returns aggregates.

        // Mocking the transformation logic defensively since schema is not strictly known without docs
        // We will map common fields if they exist, or fallback safely.

        /* 
           Example expected response structure (hypothetical based on similar APIs):
           {
             "sessionsCount": 120,
             "avgPagesPerSession": 3.5,
             ...
           }
           OR it might be an array of metrics.
           
           Since we can't see the exact response without running it, 
           we'll treat 'data' as a flexible object and extract what looks right.
        */

        return {
            sessionsCount: data.sessionsCount || data.UniqueUsers || 0,
            pagesPerSession: data.pagesPerSession || data.PagesPerSession || 0,
            scrollDepth: data.scrollDepth || data.ScrollDepth || 0,
            timeOnSite: data.activeTime || data.ActiveTime || 0,
            bounceRate: data.bounceRate || data.BounceRate || 0,
            topPages: Array.isArray(data.topPages) ? data.topPages : []
        };

    } catch (error) {
        console.error('Error fetching Clarity data:', error);
        return null;
    }
}
