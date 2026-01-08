'use server';

import { fetchClarityData } from "@/lib/integrations/clarity";
import { getIntegration } from "@/lib/integrations/manager";

export async function getClarityInsights(projectId: string) {
    if (!projectId) return null;

    // First check if we have the integration and if api_token is likely set
    const integration = await getIntegration(projectId, 'microsoft_clarity');
    if (!integration) return null;

    // Fetch real data
    const data = await fetchClarityData(projectId, 3); // Last 3 days

    if (!data) {
        // Fallback: If no API token but integration exists, we return null so UI can show "Connect API for Insights" or simulated data
        // But for now, let's just return null and handle UI state.
        return null;
    }

    return data;
}
