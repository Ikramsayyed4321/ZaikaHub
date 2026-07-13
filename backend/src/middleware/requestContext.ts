import type { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { logger } from '../services/logger.js';

export function requestContext(request: Request, response: Response, next: NextFunction) {
  const requestId = request.header('x-request-id') || randomUUID();
  response.setHeader('x-request-id', requestId);
  const started = Date.now();

  response.on('finish', () => {
    logger.info('http_request', {
      requestId,
      method: request.method,
      path: request.originalUrl,
      statusCode: response.statusCode,
      durationMs: Date.now() - started,
      ip: request.ip,
      userAgent: request.headers['user-agent'],
    });
  });

  next();
}
