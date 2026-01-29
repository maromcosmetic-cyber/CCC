/**
 * Authentication Middleware
 * Handles JWT token and API key authentication for REST endpoints
 * Requirements: 11.4
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';

export interface AuthService {
  validateApiKey(apiKey: string): Promise<ApiKeyValidationResult>;
  validateJwtToken(token: string): Promise<JwtValidationResult>;
  getUserPermissions(userId: string): Promise<string[]>;
}

export interface ApiKeyValidationResult {
  valid: boolean;
  userId?: string;
  permissions?: string[];
  rateLimitTier?: string;
}

export interface JwtValidationResult {
  valid: boolean;
  userId?: string;
  permissions?: string[];
  expiresAt?: Date;
}

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    permissions: string[];
    authMethod: 'jwt' | 'api_key';
    rateLimitTier?: string;
  };
}

/**
 * Authentication middleware factory
 */
export function authMiddleware(authService: AuthService) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Skip authentication for health check and public endpoints
      if (req.path === '/health' || req.path === '/api' || req.path === '/api/docs') {
        return next();
      }

      const authHeader = req.headers.authorization;
      const apiKey = req.headers['x-api-key'] as string;

      // Check for API key authentication
      if (apiKey) {
        const result = await authService.validateApiKey(apiKey);
        
        if (!result.valid) {
          res.status(401).json({
            success: false,
            error: 'Invalid API key',
            timestamp: new Date().toISOString()
          });
          return;
        }

        req.user = {
          id: result.userId!,
          permissions: result.permissions || [],
          authMethod: 'api_key',
          rateLimitTier: result.rateLimitTier
        };

        return next();
      }

      // Check for JWT token authentication
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        
        const result = await authService.validateJwtToken(token);
        
        if (!result.valid) {
          res.status(401).json({
            success: false,
            error: 'Invalid or expired JWT token',
            timestamp: new Date().toISOString()
          });
          return;
        }

        req.user = {
          id: result.userId!,
          permissions: result.permissions || [],
          authMethod: 'jwt'
        };

        return next();
      }

      // No authentication provided
      res.status(401).json({
        success: false,
        error: 'Authentication required. Provide either Authorization header with Bearer token or X-API-Key header',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Authentication error:', error);
      res.status(500).json({
        success: false,
        error: 'Authentication service error',
        timestamp: new Date().toISOString()
      });
    }
  };
}

/**
 * Permission-based authorization middleware
 */
export function requirePermissions(requiredPermissions: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
        timestamp: new Date().toISOString()
      });
      return;
    }

    const userPermissions = req.user.permissions;
    const hasPermission = requiredPermissions.every(permission => 
      userPermissions.includes(permission) || userPermissions.includes('admin')
    );

    if (!hasPermission) {
      res.status(403).json({
        success: false,
        error: 'Insufficient permissions',
        required_permissions: requiredPermissions,
        timestamp: new Date().toISOString()
      });
      return;
    }

    next();
  };
}

/**
 * Default authentication service implementation
 */
export class DefaultAuthService implements AuthService {
  private jwtSecret: string;
  private apiKeys: Map<string, ApiKeyValidationResult>;

  constructor(jwtSecret: string) {
    this.jwtSecret = jwtSecret;
    this.apiKeys = new Map();
    
    // Initialize with some default API keys for testing
    this.apiKeys.set('test-api-key-123', {
      valid: true,
      userId: 'test-user-1',
      permissions: ['read:social_events', 'read:analytics'],
      rateLimitTier: 'standard'
    });
    
    this.apiKeys.set('admin-api-key-456', {
      valid: true,
      userId: 'admin-user-1',
      permissions: ['admin'],
      rateLimitTier: 'premium'
    });
  }

  async validateApiKey(apiKey: string): Promise<ApiKeyValidationResult> {
    const result = this.apiKeys.get(apiKey);
    return result || { valid: false };
  }

  async validateJwtToken(token: string): Promise<JwtValidationResult> {
    try {
      const decoded = jwt.verify(token, this.jwtSecret) as any;
      
      return {
        valid: true,
        userId: decoded.sub || decoded.userId,
        permissions: decoded.permissions || [],
        expiresAt: new Date(decoded.exp * 1000)
      };
    } catch (error) {
      console.error('JWT validation error:', error);
      return { valid: false };
    }
  }

  async getUserPermissions(userId: string): Promise<string[]> {
    // In a real implementation, this would query the database
    const defaultPermissions = ['read:social_events', 'read:analytics'];
    
    if (userId === 'admin-user-1') {
      return ['admin'];
    }
    
    return defaultPermissions;
  }

  /**
   * Generate a JWT token for testing
   */
  generateTestToken(userId: string, permissions: string[] = []): string {
    return jwt.sign(
      {
        sub: userId,
        permissions,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
      },
      this.jwtSecret
    );
  }

  /**
   * Add a new API key
   */
  addApiKey(apiKey: string, userId: string, permissions: string[], rateLimitTier: string = 'standard'): void {
    this.apiKeys.set(apiKey, {
      valid: true,
      userId,
      permissions,
      rateLimitTier
    });
  }

  /**
   * Revoke an API key
   */
  revokeApiKey(apiKey: string): void {
    this.apiKeys.delete(apiKey);
  }
}