import { ZodError } from 'zod';
import { config } from '../config.js';
import { logger } from '../services/logger.js';
export function notFound(request, response) {
    response.status(404).json({
        code: 'NOT_FOUND',
        message: `Route ${request.method} ${request.originalUrl} was not found`,
    });
}
export function errorHandler(error, request, response, _next) {
    if (error instanceof ZodError) {
        response.status(422).json({
            code: 'VALIDATION_ERROR',
            message: 'Request validation failed',
            issues: error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message })),
        });
        return;
    }
    const statusCode = error.statusCode && error.statusCode >= 400 && error.statusCode < 600 ? error.statusCode : 500;
    const code = error.code || (statusCode >= 500 ? 'INTERNAL_ERROR' : 'REQUEST_ERROR');
    if (statusCode >= 500) {
        logger.error('unhandled_error', {
            requestId: response.getHeader('x-request-id'),
            method: request.method,
            path: request.originalUrl,
            error: error.message,
            stack: config.nodeEnv === 'production' ? undefined : error.stack,
        });
    }
    response.status(statusCode).json({
        code,
        message: statusCode >= 500 && config.nodeEnv === 'production' ? 'Internal server error' : error.message,
    });
}
