
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';

// GET /api/marketing/analytics/report
// Fetch traffic/funnel data
export async function GET(req: NextRequest) {
    try {
        const auth = await requireAuth(req);
        if (auth.response) return auth.response;

        const { searchParams } = new URL(req.url);

        if (searchParams.get('check_status') === 'true') {
            const isModuleEnabled = req.cookies.get('ccc_analytics_module_enabled')?.value === 'true';
            const isGoogleConnected = req.cookies.get('ccc_analytics_google_connected')?.value === 'true';
            const isFacebookConnected = req.cookies.get('ccc_analytics_facebook_connected')?.value === 'true';

            return NextResponse.json({
                module_enabled: isModuleEnabled,
                google_connected: isGoogleConnected,
                facebook_connected: isFacebookConnected,
                data: (isGoogleConnected || isFacebookConnected) ? getMockData() : null
            });
        }

        // Return empty/null if no providers connected, or handle in UI
        const isGoogleConnected = req.cookies.get('ccc_analytics_google_connected')?.value === 'true';
        if (!isGoogleConnected) {
            return NextResponse.json(null);
        }

        const period = searchParams.get('period') || 'week';

        return NextResponse.json(getMockData());

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

function getMockData() {
    // Mock Data for Demo
    // In real app, we'd fetch from Google Analytics Data API
    const trafficData = Array.from({ length: 7 }, (_, i) => ({
        date: new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        visits: Math.floor(Math.random() * 500) + 100,
        drop_off: Math.floor(Math.random() * 50) + 10
    }));

    const funnelData = [
        { name: 'Landing', value: 1000, fill: '#2B71FF' },
        { name: 'Product', value: 600, fill: '#4C85FF' },
        { name: 'Cart', value: 300, fill: '#6D99FF' },
        { name: 'Checkout', value: 150, fill: '#8EADFF' },
        { name: 'Purchase', value: 80, fill: '#AFC1FF' },
    ];

    return {
        traffic: trafficData,
        funnel: funnelData,
        summary: {
            total_visits: trafficData.reduce((acc, curr) => acc + curr.visits, 0),
            conversion_rate: '8%',
            avg_session: '2m 14s'
        }
    };
}
