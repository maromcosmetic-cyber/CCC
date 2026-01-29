/**
 * Authentication types for the Brand-Aware Social Intelligence & Action Engine
 */

import { Platform } from '../types/core';

export interface AuthToken {
  accessToken: string;
  refreshToken?: string;
  expiresAt: Date;
  scopes: string[];
  platform: Platform;
  tokenType?: string;
}

export interface PlatformCredentials {
  clientId: string;
  clientSecret: string;
  redirectUri?: string;
  scopes?: string[];
}

export interface AuthConfig {
  [Platform.TIKTOK]: PlatformCredentials;
  [Platform.INSTAGRAM]: PlatformCredentials;
  [Platform.FACEBOOK]: PlatformCredentials;
  [Platform.YOUTUBE]: PlatformCredentials;
  [Platform.REDDIT]: PlatformCredentials;
  [Platform.RSS]: PlatformCredentials;
}

export interface TokenHealthReport {
  platform: Platform;
  isValid: boolean;
  expiresIn: number; // seconds
  lastRefreshed: Date;
  errors: string[];
}

export interface AuthError extends Error {
  platform: Platform;
  code: string;
  retryable: boolean;
}

export interface RateLimitError extends AuthError {
  resetTime: Date;
  remainingRequests: number;
}