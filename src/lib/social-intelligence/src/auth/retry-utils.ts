/**
 * Retry Utilities for Authentication
 * Implements exponential backoff and retry logic for authentication failures
 */

import { RetryPolicy, AuthError, AuthenticationError } from './types';
import { Platform } from '../types/core';

/**
 * Sleep for a specified number of milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Add jitter to delay to prevent thundering herd problem
 */
function addJitter(delay: number, jitter: boolean = true): number {
  if (!jitter) return delay;
  
  // Add random jitter of ±25%
  const jitterAmount = delay * 0.25;
  const randomJitter = (Math.random() - 0.5) * 2 * jitterAmount;
  return Math.max(0, delay + randomJitter);
}

/**
 * Calculate delay for exponential backoff
 */
function calculateDelay(
  attempt: number,
  policy: RetryPolicy
): number {
  const exponentialDelay = policy.baseDelay * Math.pow(policy.backoffMultiplier, attempt - 1);
  const cappedDelay = Math.min(exponentialDelay, policy.maxDelay);
  return addJitter(cappedDelay, policy.jitter);
}

/**
 * Determine if an error is retryable
 */
function isRetryableError(error: any): boolean {
  if (error instanceof AuthenticationError) {
    switch (error.errorType) {
      case AuthError.NETWORK_ERROR:
      case AuthError.PLATFORM_ERROR:
      case AuthError.RATE_LIMITED:
        return true;
      case AuthError.INVALID_CREDENTIALS:
      case AuthError.TOKEN_EXPIRED:
      case AuthError.INSUFFICIENT_PERMISSIONS:
        return false;
      default:
        return false;
    }
  }
  
  // Check for common network errors
  if (error.code === 'ECONNRESET' || 
      error.code === 'ENOTFOUND' || 
      error.code === 'ETIMEDOUT') {
    return true;
  }
  
  // Check for HTTP status codes that are retryable
  if (error.response?.status) {
    const status = error.response.status;
    return status >= 500 || status === 429; // Server errors and rate limiting
  }
  
  return false;
}

/**
 * Extract retry-after header from rate limit responses
 */
function getRetryAfterDelay(error: any): number | null {
  if (error.response?.headers) {
    const retryAfter = error.response.headers['retry-after'] || 
                      error.response.headers['Retry-After'];
    
    if (retryAfter) {
      const seconds = parseInt(retryAfter, 10);
      return isNaN(seconds) ? null : seconds * 1000; // Convert to milliseconds
    }
  }
  
  return null;
}

/**
 * Retry an async operation with exponential backoff
 */
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  policy: RetryPolicy = {
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 30000,
    backoffMultiplier: 2,
    jitter: true
  },
  context?: { platform?: Platform; operationType?: string }
): Promise<T> {
  let lastError: any;
  
  for (let attempt = 1; attempt <= policy.maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      // Don't retry if this is the last attempt
      if (attempt === policy.maxAttempts) {
        break;
      }
      
      // Don't retry if error is not retryable
      if (!isRetryableError(error)) {
        break;
      }
      
      // Calculate delay for this attempt
      let delay = calculateDelay(attempt, policy);
      
      // Check for rate limit specific delay
      const retryAfterDelay = getRetryAfterDelay(error);
      if (retryAfterDelay !== null) {
        delay = Math.max(delay, retryAfterDelay);
      }
      
      // Log retry attempt (in production, use proper logging)
      console.warn(
        `Retry attempt ${attempt}/${policy.maxAttempts} for ${context?.platform || 'unknown'} ` +
        `${context?.operationType || 'operation'} after ${delay}ms delay. Error: ${error instanceof Error ? error.message : String(error)}`
      );
      
      await sleep(delay);
    }
  }
  
  // All retries exhausted, throw the last error
  throw lastError;
}

/**
 * Retry policy specifically for authentication operations
 */
export const AUTH_RETRY_POLICY: RetryPolicy = {
  maxAttempts: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
  jitter: true
};

/**
 * Retry policy for token refresh operations
 */
export const TOKEN_REFRESH_RETRY_POLICY: RetryPolicy = {
  maxAttempts: 2,
  baseDelay: 500,
  maxDelay: 5000,
  backoffMultiplier: 2,
  jitter: true
};

/**
 * Retry policy for rate-limited operations
 */
export const RATE_LIMIT_RETRY_POLICY: RetryPolicy = {
  maxAttempts: 5,
  baseDelay: 2000,
  maxDelay: 60000,
  backoffMultiplier: 2,
  jitter: true
};

/**
 * Circuit breaker implementation for authentication services
 */
export class AuthCircuitBreaker {
  private failures: Map<Platform, number> = new Map();
  private lastFailureTime: Map<Platform, Date> = new Map();
  private isOpen: Map<Platform, boolean> = new Map();
  
  constructor(
    private failureThreshold: number = 5,
    private recoveryTimeout: number = 30000, // 30 seconds
    private successThreshold: number = 3
  ) {}

  /**
   * Check if circuit is open for a platform
   */
  isCircuitOpen(platform: Platform): boolean {
    const isOpen = this.isOpen.get(platform) || false;
    
    if (isOpen) {
      const lastFailure = this.lastFailureTime.get(platform);
      if (lastFailure && Date.now() - lastFailure.getTime() > this.recoveryTimeout) {
        // Move to half-open state
        this.isOpen.set(platform, false);
        return false;
      }
    }
    
    return isOpen;
  }

  /**
   * Record a successful operation
   */
  recordSuccess(platform: Platform): void {
    this.failures.set(platform, 0);
    this.isOpen.set(platform, false);
  }

  /**
   * Record a failed operation
   */
  recordFailure(platform: Platform): void {
    const currentFailures = this.failures.get(platform) || 0;
    const newFailures = currentFailures + 1;
    
    this.failures.set(platform, newFailures);
    this.lastFailureTime.set(platform, new Date());
    
    if (newFailures >= this.failureThreshold) {
      this.isOpen.set(platform, true);
      console.warn(`Circuit breaker opened for platform: ${platform}`);
    }
  }

  /**
   * Execute operation with circuit breaker protection
   */
  async execute<T>(
    platform: Platform,
    operation: () => Promise<T>
  ): Promise<T> {
    if (this.isCircuitOpen(platform)) {
      throw new AuthenticationError(
        platform,
        AuthError.PLATFORM_ERROR,
        'Circuit breaker is open - too many recent failures'
      );
    }

    try {
      const result = await operation();
      this.recordSuccess(platform);
      return result;
    } catch (error) {
      this.recordFailure(platform);
      throw error;
    }
  }

  /**
   * Get circuit breaker status for all platforms
   */
  getStatus(): Record<string, {
    failures: number;
    isOpen: boolean;
    lastFailure?: Date;
  }> {
    const status: Record<string, any> = {};
    
    for (const platform of Object.values(Platform)) {
      status[platform] = {
        failures: this.failures.get(platform) || 0,
        isOpen: this.isOpen.get(platform) || false,
        lastFailure: this.lastFailureTime.get(platform)
      };
    }
    
    return status;
  }

  /**
   * Reset circuit breaker for a platform
   */
  reset(platform: Platform): void {
    this.failures.set(platform, 0);
    this.isOpen.set(platform, false);
    this.lastFailureTime.delete(platform);
  }

  /**
   * Reset all circuit breakers
   */
  resetAll(): void {
    this.failures.clear();
    this.isOpen.clear();
    this.lastFailureTime.clear();
  }
}