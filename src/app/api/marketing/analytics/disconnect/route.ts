
import { NextRequest, NextResponse } from 'next/server';

// POST /api/marketing/analytics/disconnect
export async function POST(req: NextRequest) {
    const response = NextResponse.json({ success: true, message: "Disconnected" });
    response.cookies.delete('ccc_analytics_module_enabled');
    response.cookies.delete('ccc_analytics_google_connected');
    response.cookies.delete('ccc_analytics_facebook_connected');
    return response;
}
