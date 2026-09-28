// ============================================================
// Clyptus Job Portal - Platform Super Admin
// Centralized Audit Module
// ============================================================

import { Global, Module } from '@nestjs/common';
import { AuditService } from './audit.service';
import { AuditInterceptor } from '../../common/interceptors/audit.interceptor';

@Global()
@Module({
  providers: [AuditService, AuditInterceptor],
  exports: [AuditService, AuditInterceptor],
})
export class AuditModule {}
