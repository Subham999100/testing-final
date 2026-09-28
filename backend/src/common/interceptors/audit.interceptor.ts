// ============================================================
// Clyptus Job Portal - Platform Super Admin
// Audit Interceptor - Intercepts Mutating Actions & Persists Logs
// ============================================================

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuditService } from '../../modules/audit/audit.service';
import { AUDIT_METADATA_KEY, AuditActionOptions } from '../decorators/audit.decorator';
import { AuthenticatedUser } from '../interfaces/authenticated-user.interface';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly auditService: AuditService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const auditOptions = this.reflector.get<AuditActionOptions>(
      AUDIT_METADATA_KEY,
      context.getHandler(),
    );

    if (!auditOptions) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user as AuthenticatedUser | undefined;
    const ipAddress = request.ip || request.headers['x-forwarded-for'] || request.socket?.remoteAddress;
    const userAgent = request.headers['user-agent'];

    return next.handle().pipe(
      tap({
        next: (result) => {
          // Resolve entityId from response data or route params
          let entityId = 'N/A';
          if (result && typeof result === 'object') {
            entityId = result.id || (result.data && result.data.id) || request.params?.id || 'N/A';
          } else if (request.params?.id) {
            entityId = request.params.id;
          }

          // Build audit payload safely
          const metadata: Record<string, any> = {
            method: request.method,
            path: request.url,
            params: request.params,
            query: request.query,
          };

          // Record non-sensitive request body summary if present
          if (request.body && typeof request.body === 'object') {
            metadata.requestBodySummary = Object.keys(request.body);
          }

          this.auditService.record({
            actorId: user?.userId || null,
            actorRole: user?.role || 'SYSTEM',
            action: auditOptions.action,
            entityType: auditOptions.entityType,
            entityId: String(entityId),
            organisationId: request.params?.organisationId || request.body?.organisationId || null,
            metadata,
            ipAddress: typeof ipAddress === 'string' ? ipAddress : undefined,
            userAgent: typeof userAgent === 'string' ? userAgent : undefined,
          });
        },
      }),
    );
  }
}
