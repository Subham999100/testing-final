// ============================================================
// Clyptus Job Portal - Platform Super Admin
// Global Exception Filter - Sanitizes and Standardizes Error Responses
// ============================================================

import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ApiErrorResponse } from '../interfaces/api-response.interface';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'An unexpected internal error occurred';
    let code = 'INTERNAL_SERVER_ERROR';
    let details: any = undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();

      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object' && res !== null) {
        const resObj = res as Record<string, any>;
        message = resObj.message || message;
        code = resObj.error || `HTTP_${status}`;
        details = resObj.details || (Array.isArray(resObj.message) ? resObj.message : undefined);

        if (Array.isArray(resObj.message)) {
          message = resObj.message.join(', ');
        }
      }
    } else if (exception instanceof Error) {
      // Never leak unhandled stack trace or raw SQL/database error messages to client
      this.logger.error(`Unhandled Exception at ${request.method} ${request.url}: ${exception.message}`, exception.stack);
      message = 'An internal system error occurred. Please contact platform support.';
      code = 'PLATFORM_SYSTEM_ERROR';
    }

    const errorPayload: ApiErrorResponse = {
      success: false,
      error: {
        code,
        message,
        details,
        timestamp: new Date().toISOString(),
        path: request.url,
      },
    };

    response.status(status).json(errorPayload);
  }
}
