/**
 * Error Handler Middleware
 * Centralized error handling for API endpoints
 * Requirements: 11.7
 */

import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

export class ApiError extends Error {
  public statusCode: number;
  public code: string;
  public details?: any;

  constructor(message: string, statusCode: number = 500, code?: string, details?: any) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code || 'INTERNAL_ERROR';
    this.details = details;
  }
}

/**
 * Create a standardized API error
 */
export function createApiError(
  message: string, 
  statusCode: number = 500, 
  code?: string, 
  details?: any
): ApiError {
  return new ApiError(message, statusCode, code, details);
}

/**
 * Async handler wrapper to catch async errors
 */
export function asyncHandler(fn: Function) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Main error handler middleware
 */
export function errorHandler(
  error: Error | ApiError | z.ZodError,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  console.error('API Error:', {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString()
  });

  // Handle Zod validation errors
  if (error instanceof z.ZodError) {
    res.status(400).json({
      success: false,
      error: 'Invalid request data',
      details: error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message,
        code: err.code
      })),
      timestamp: new Date().toISOString()
    });
    return;
  }

  // Handle custom API errors
  if (error instanceof ApiError) {
    res.status(error.statusCode).json({
      success: false,
      error: error.message,
      code: error.code,
      ...(error.details && { details: error.details }),
      timestamp: new Date().toISOString()
    });
    return;
  }

  // Handle generic errors
  const statusCode = (error as any).statusCode || 500;
  const message = statusCode === 500 ? 'Internal server error' : error.message;

  res.status(statusCode).json({
    success: false,
    error: message,
    timestamp: new Date().toISOString()
  });
}