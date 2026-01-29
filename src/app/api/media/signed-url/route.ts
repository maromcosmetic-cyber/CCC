import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/auth/server';

/**
 * GET /api/media/signed-url
 * 
 * Creates a signed URL for accessing a storage file
 * Required query params: bucket, path
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const bucket = searchParams.get('bucket');
    const path = searchParams.get('path');
    const expiresIn = parseInt(searchParams.get('expiresIn') || '3600'); // Default 1 hour

    if (!bucket || !path) {
      return NextResponse.json(
        { error: 'Missing required parameters: bucket and path' },
        { status: 400 }
      );
    }

    const supabaseAdmin = createServiceRoleClient();

    // Create signed URL
    const { data, error } = await supabaseAdmin.storage
      .from(bucket)
      .createSignedUrl(path, expiresIn);

    if (error) {
      console.error('Failed to create signed URL:', error);
      return NextResponse.json(
        { error: 'Failed to create signed URL', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      signedUrl: data.signedUrl,
      expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
    });
  } catch (error: any) {
    console.error('Signed URL API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}