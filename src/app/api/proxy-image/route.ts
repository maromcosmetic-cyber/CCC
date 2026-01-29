import { NextRequest, NextResponse } from 'next/server';

/**
 * Proxy endpoint to fetch images and bypass CORS restrictions
 * This allows PDF generation to include external images
 */
export async function GET(request: NextRequest) {
    try {
        const url = request.nextUrl.searchParams.get('url');
        
        if (!url) {
            return NextResponse.json(
                { error: 'Missing url parameter' },
                { status: 400 }
            );
        }

        // Validate URL
        let imageUrl: URL;
        try {
            imageUrl = new URL(url);
        } catch (e) {
            return NextResponse.json(
                { error: 'Invalid URL' },
                { status: 400 }
            );
        }

        // Only allow http and https protocols
        if (!['http:', 'https:'].includes(imageUrl.protocol)) {
            return NextResponse.json(
                { error: 'Invalid protocol' },
                { status: 400 }
            );
        }

        // Fetch the image
        const imageResponse = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        if (!imageResponse.ok) {
            return NextResponse.json(
                { error: 'Failed to fetch image' },
                { status: imageResponse.status }
            );
        }

        // Get content type
        const contentType = imageResponse.headers.get('content-type') || 'image/jpeg';
        
        // Validate it's an image
        if (!contentType.startsWith('image/')) {
            return NextResponse.json(
                { error: 'URL does not point to an image' },
                { status: 400 }
            );
        }

        // Get image data
        const imageBuffer = await imageResponse.arrayBuffer();

        // Return image with appropriate headers
        return new NextResponse(imageBuffer, {
            headers: {
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=86400', // Cache for 24 hours
                'Access-Control-Allow-Origin': '*',
            },
        });
    } catch (error) {
        console.error('Image proxy error:', error);
        return NextResponse.json(
            { error: 'Failed to proxy image' },
            { status: 500 }
        );
    }
}

