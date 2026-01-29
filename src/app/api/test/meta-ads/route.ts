
import { NextRequest, NextResponse } from 'next/server';
import { fetchCompetitorAds } from '@/lib/competitor/meta-ads-scraper';

export async function POST(req: NextRequest) {
    try {
        const { projectId, url } = await req.json();

        if (!projectId || !url) {
            return NextResponse.json({ error: 'Missing projectId or url' }, { status: 400 });
        }

        console.log(`🧪 Testing Meta Ads for ${url} (Project: ${projectId})`);

        const result = await fetchCompetitorAds(url, projectId);

        return NextResponse.json({
            success: true,
            data: result
        });

    } catch (error: any) {
        console.error('❌ Meta Ads Test Failed:', error);
        return NextResponse.json({
            success: false,
            error: error.message,
            details: error
        }, { status: 500 });
    }
}
