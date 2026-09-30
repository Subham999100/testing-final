// ============================================================
// Clyptus Job Portal - Platform Super Admin
// Centralized Audit Module
// ============================================================

import { Global, Module } from '@nestjs/common';
import { AuditService } from './audit.service';
@Global()
@Module({
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}
