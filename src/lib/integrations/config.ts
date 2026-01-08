// Integration configuration - defines platform vs user-managed providers

import { Integration } from '@/types/models';

/**
 * User-managed providers: Require user credentials from database
 * No fallback to environment variables
 * Users manage and pay for these services
 */
export const USER_MANAGED_PROVIDERS: readonly Integration['provider_type'][] = [
  'meta',
  'google_ads',
  'lazada',
  'tiktok',
  'woocommerce',
  'google_analytics',
  'google_business',
  'microsoft_clarity',
  'wordpress',
] as const;

/**
 * Platform-managed providers: Use platform credentials from env vars
 * Not stored in integrations table
 * Platform provides and pays for these services
 * All AI services (LLM, Image, TTS, Lip-Sync) use Kie AI as unified gateway
 */
export const PLATFORM_MANAGED_PROVIDERS: readonly Integration['provider_type'][] = [
  'firecrawl',
  'llm',        // Uses Kie AI
  'image',      // Uses Kie AI
  'elevenlabs', // Uses Kie AI
  'synclabs',   // Uses Kie AI
] as const;

/**
 * Check if a provider is user-managed
 */
export function isUserManagedProvider(
  providerType: Integration['provider_type']
): boolean {
  return (USER_MANAGED_PROVIDERS as readonly string[]).includes(providerType);
}

/**
 * Check if a provider is platform-managed
 */
export function isPlatformManagedProvider(
  providerType: Integration['provider_type']
): boolean {
  return (PLATFORM_MANAGED_PROVIDERS as readonly string[]).includes(providerType);
}

/**
 * Get all provider types
 */
export function getAllProviderTypes(): Integration['provider_type'][] {
  return [
    ...USER_MANAGED_PROVIDERS,
    ...PLATFORM_MANAGED_PROVIDERS,
  ];
}

