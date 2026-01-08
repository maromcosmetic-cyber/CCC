// Test integration connection

import { NextRequest, NextResponse } from 'next/server';
import { testIntegration } from '@/lib/integrations/manager';
import { isUserManagedProvider } from '@/lib/integrations/config';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; providerType: string } }
) {
  try {
    const { id: projectId, providerType } = params;

    // Only allow testing user-managed providers
    if (!isUserManagedProvider(providerType as any)) {
      return NextResponse.json(
        { error: `Provider ${providerType} is platform-managed and cannot be tested by users` },
        { status: 400 }
      );
    }

    const result = await testIntegration(projectId, providerType as any);

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

