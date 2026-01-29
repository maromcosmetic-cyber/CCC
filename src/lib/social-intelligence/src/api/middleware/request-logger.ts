/**
 * Request Logger Middleware
 * Logs API requests for monitoring and debugging
 * Requirements: 11.7
 */

import { Request, Response, NextFunction } from 'express';

export interface RequestLogEntry {
  timestamp: string;
  method: string;
  url: string;
  userAgent?: string;
  ip: string;
  userId?: string;
  authMethod?: string;
  statusCode?: number;
  responseTime?: number;
  contentLength?: number;
  error?: string;
}

/**
 * Create a log message from request data
 */
export function createLogMessage(req: Request, res: Response, responseTime: number): RequestLogEntry {
  const authenticatedReq = req as any;
  
  return {
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url,
    userAgent: req.get('User-Agent'),
    ip: req.ip || req.connection.remoteAddress || 'unknown',
    userId: authenticatedReq.user?.id,
    authMethod: authenticatedReq.user?.authMethod,
    statusCode: res.statusCode,
    responseTime,
    contentLength: res.get('Content-Length') ? parseInt(res.get('Content-Length')!, 10) : undefined
  };
}

/**
 * Request logger middleware
 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const startTime = Date.now();

  // Override res.end to capture response data
  const originalEnd = res.end.bind(res);
  
  res.end = function(chunk?: any, encoding?: any, cb?: () => void) {
    const responseTime = Date.now() - startTime;
    const logEntry = createLogMessage(req, res, responseTime);

    // Log the request
    console.log('API Request:', JSON.stringify(logEntry, null, 2));

    // Call original end method with proper return
    return originalEnd(chunk, encoding, cb);
  } as any;

  next();
}