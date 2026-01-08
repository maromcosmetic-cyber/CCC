// Integrations API - Manage user API keys

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/db/client';
import { listIntegrations, upsertIntegration, deleteIntegration, getIntegrationCredentials } from '@/lib/integrations/manager';
import { logAuditEvent } from '@/lib/audit/logger';
import { isUserManagedProvider } from '@/lib/integrations/config';
import { requireAuth } from '@/lib/auth/middleware';
import { z } from 'zod';

// Only allow user-managed providers
const CreateIntegrationSchema = z.object({
  provider_type: z.enum(['meta', 'google_ads', 'lazada', 'tiktok', 'woocommerce', 'google_analytics', 'google_business', 'microsoft_clarity', 'wordpress']),
  credentials: z.record(z.any()),
  config: z.record(z.any()).optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Require authentication
    const auth = await requireAuth(request);
    if (auth.response) {
      return auth.response;
    }

    const projectId = params.id;

    const integrations = await listIntegrations(projectId);

    // Return integrations without encrypted credentials
    const safeIntegrations = integrations.map((integration) => ({
      id: integration.id,
      provider_type: integration.provider_type,
      status: integration.status,
      last_sync_at: integration.last_sync_at,
      config: integration.config,
      created_at: integration.created_at,
      updated_at: integration.updated_at,
      // Don't return credentials_encrypted for security
    }));

    return NextResponse.json({ integrations: safeIntegrations });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const projectId = params.id;
    const body = await request.json();
    const validated = CreateIntegrationSchema.parse(body);

    // Validate that this is a user-managed provider
    if (!isUserManagedProvider(validated.provider_type)) {
      return NextResponse.json(
        { error: `Provider ${validated.provider_type} is platform-managed and cannot be configured by users` },
        { status: 400 }
      );
    }

    const authResult = await requireAuth(request);
    if (authResult.response) return authResult.response;
    const user = authResult.user!;

    // Fetch existing credentials to merge if applicable
    let finalCredentials = validated.credentials;
    try {
      const existingCreds = await getIntegrationCredentials(projectId, validated.provider_type);
      if (existingCreds) {
        // Merge existing with new.
        // Logic: If new value is provided and valid, use it. If not, use existing.
        // For strings (like tokens), if new is empty string, keep existing.

        const merged = { ...existingCreds };

        Object.entries(validated.credentials).forEach(([key, value]) => {
          // If value is explicitly provided and not empty (if string), update it.
          // If it's a boolean or number, update it.
          // If it's an empty string, WE ASSUME USER DID NOT RE-ENTER IT -> KEEP EXISTING.
          if (typeof value === 'string') {
            if (value.trim() !== '') {
              merged[key] = value;
            }
          } else if (value !== undefined && value !== null) {
            merged[key] = value;
          }
        });
        finalCredentials = merged;
      }
    } catch (e) {
      console.warn("Failed to fetch existing credentials for merge, overwriting.", e);
    }

    const integration = await upsertIntegration({
      project_id: projectId,
      provider_type: validated.provider_type,
      credentials: finalCredentials,
      config: validated.config,
    });

    await logAuditEvent({
      event_type: 'integration_created',
      actor_id: user.id,
      actor_type: 'user',
      source: 'ui',
      project_id: projectId,
      payload: { provider_type: validated.provider_type },
    });

    return NextResponse.json({
      integration: {
        id: integration.id,
        provider_type: integration.provider_type,
        status: integration.status,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.errors }, { status: 400 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Require authentication
    const auth = await requireAuth(request);
    if (auth.response) {
      return auth.response;
    }

    const user = auth.user!;
    const projectId = params.id;
    const searchParams = request.nextUrl.searchParams;
    const providerType = searchParams.get('provider_type');

    if (!providerType) {
      return NextResponse.json({ error: 'provider_type is required' }, { status: 400 });
    }

    await deleteIntegration(projectId, providerType as any);

    await logAuditEvent({
      event_type: 'integration_deleted',
      actor_id: user.id,
      actor_type: 'user',
      source: 'ui',
      project_id: projectId,
      payload: { provider_type: providerType },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

