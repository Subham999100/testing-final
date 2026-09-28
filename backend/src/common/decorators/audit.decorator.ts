// ============================================================
// Clyptus Job Portal - Platform Super Admin
// Audit Decorator - Declares Audit Log Metadata on Controller Endpoints
// ============================================================

import { SetMetadata } from '@nestjs/common';

export const AUDIT_METADATA_KEY = 'audit_metadata';

export interface AuditActionOptions {
  action: string;
  entityType: string;
  description?: string;
}

export const Audited = (options: AuditActionOptions) =>
  SetMetadata(AUDIT_METADATA_KEY, options);
