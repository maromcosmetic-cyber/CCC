// Integration Manager - handles user-specific API credentials

import { supabase, supabaseAdmin } from '../db/client';
import { encryptCredentials, decryptCredentials } from '../encryption/credentials';
import { Integration } from '@/types/models';
import { isUserManagedProvider, isPlatformManagedProvider } from './config';

export interface IntegrationCredentials {
  [key: string]: string | number | boolean;
}

export interface CreateIntegrationInput {
  project_id: string;
  provider_type: Integration['provider_type'];
  credentials: IntegrationCredentials;
  config?: Record<string, any>;
}

/**
 * Get integration for a project and provider type
 * Uses admin client to work in both API routes and workers
 * Only works for user-managed providers
 */
export async function getIntegration(
  projectId: string,
  providerType: Integration['provider_type']
): Promise<Integration | null> {
  // Platform-managed providers are not stored in integrations table
  if (isPlatformManagedProvider(providerType)) {
    return null;
  }

  const client = supabaseAdmin || supabase;
  const { data, error } = await client
    .from('integrations')
    .select('*')
    .eq('project_id', projectId)
    .eq('provider_type', providerType)
    .single();

  if (error || !data) {
    return null;
  }

  return data as Integration;
}

/**
 * Get decrypted credentials for an integration
 * Only works for user-managed providers
 * Returns null for platform-managed providers (they use env vars)
 */
export async function getIntegrationCredentials(
  projectId: string,
  providerType: Integration['provider_type']
): Promise<IntegrationCredentials | null> {
  // Platform-managed providers don't use database credentials
  if (isPlatformManagedProvider(providerType)) {
    return null;
  }

  const integration = await getIntegration(projectId, providerType);

  if (!integration || !integration.credentials_encrypted) {
    return null;
  }

  try {
    return decryptCredentials(integration.credentials_encrypted);
  } catch (error) {
    console.error('Failed to decrypt credentials:', error);
    return null;
  }
}

/**
 * Create or update integration with encrypted credentials
 * Only works for user-managed providers
 */
export async function upsertIntegration(input: CreateIntegrationInput): Promise<Integration> {
  // Platform-managed providers cannot be stored in integrations table
  if (isPlatformManagedProvider(input.provider_type)) {
    throw new Error(`Provider ${input.provider_type} is platform-managed and cannot be configured by users`);
  }

  const encrypted = encryptCredentials(input.credentials);
  const client = supabaseAdmin || supabase;

  // Check if integration exists
  const existing = await getIntegration(input.project_id, input.provider_type);

  if (existing) {
    // Update existing
    const { data, error } = await client
      .from('integrations')
      .update({
        credentials_encrypted: encrypted,
        config: input.config || {},
        status: 'active',
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Failed to update integration: ${error?.message}`);
    }

    return data as Integration;
  } else {
    // Create new
    const { data, error } = await client
      .from('integrations')
      .insert({
        project_id: input.project_id,
        provider_type: input.provider_type,
        credentials_encrypted: encrypted,
        config: input.config || {},
        status: 'active',
      })
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Failed to create integration: ${error?.message}`);
    }

    return data as Integration;
  }
}

/**
 * Delete integration
 */
export async function deleteIntegration(
  projectId: string,
  providerType: Integration['provider_type']
): Promise<void> {
  const client = supabaseAdmin || supabase;
  const { error } = await client
    .from('integrations')
    .delete()
    .eq('project_id', projectId)
    .eq('provider_type', providerType);

  if (error) {
    throw new Error(`Failed to delete integration: ${error.message}`);
  }
}

/**
 * List all integrations for a project
 * Only returns user-managed providers (platform providers are not stored here)
 */
export async function listIntegrations(projectId: string): Promise<Integration[]> {
  const client = supabaseAdmin || supabase;
  const { data, error } = await client
    .from('integrations')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to list integrations: ${error.message}`);
  }

  // Filter to only user-managed providers (should already be filtered by RLS, but double-check)
  const integrations = (data || []) as Integration[];
  return integrations.filter(integration => isUserManagedProvider(integration.provider_type));
}

/**
 * Test integration connection
 */
/**
 * Test integration connection
 */
export async function testIntegration(
  projectId: string,
  providerType: Integration['provider_type']
): Promise<{ success: boolean; message: string }> {
  try {
    const credentials = await getIntegrationCredentials(projectId, providerType);

    if (!credentials) {
      return { success: false, message: 'No credentials found' };
    }

    if (providerType === 'woocommerce') {
      try {
        // Dynamically import to avoid circular dependencies if any
        const { getWooCommerceClient } = await import('@/lib/woocommerce');
        const woo = await getWooCommerceClient(projectId);
        const { data } = await woo.get('system_status');

        if (data && data.environment) {
          return { success: true, message: 'WooCommerce connection successful' };
        }
        throw new Error('Invalid response from WooCommerce');
      } catch (error: any) {
        const msg = error.response?.data?.message || error.message;
        return { success: false, message: `WooCommerce connection failed: ${msg}` };
      }
    }

    if (providerType === 'meta') {
      // Basic check if token and account id exist
      if (!credentials.access_token || !credentials.ad_account_id) {
        return { success: false, message: 'Missing Meta credentials' };
      }

      // Simple validation call to Meta Graph API
      try {
        const accountId = String(credentials.ad_account_id).replace('act_', '');
        const url = `https://graph.facebook.com/v19.0/act_${accountId}?fields=name,account_status&access_token=${credentials.access_token}`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.error) {
          return { success: false, message: `Meta API Error: ${data.error.message}` };
        }
        return { success: true, message: `Connected to Meta Ad Account: ${data.name}` };
      } catch (error: any) {
        return { success: false, message: `Meta connection failed: ${error.message}` };
      }
    }

    // Default for others
    return { success: true, message: 'Credentials found (Connection test not implemented for this provider)' };
  } catch (error: any) {
    console.error('Test integration error:', error);
    return { success: false, message: `Test failed: ${error.message}` };
  }
}

