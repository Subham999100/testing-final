// ============================================================
// Clyptus Job Portal - Platform Super Admin
// Platform-Level Permissions Dictionary
// ============================================================

export const PlatformPermissions = {
  // Organisation Management
  ORGANISATIONS_READ: 'platform.organisations.read',
  ORGANISATIONS_CREATE: 'platform.organisations.create',
  ORGANISATIONS_UPDATE: 'platform.organisations.update',
  ORGANISATIONS_SUSPEND: 'platform.organisations.suspend',
  ORGANISATIONS_DELETE: 'platform.organisations.delete',
  ORGANISATIONS_VERIFY: 'platform.organisations.verify',
  ORGANISATIONS_REJECT: 'platform.organisations.reject',

  // User Accounts
  USERS_READ: 'platform.users.read',

  // Platform Admin Management
  ADMINS_READ: 'platform.admins.read',
  ADMINS_CREATE: 'platform.admins.create',
  ADMINS_UPDATE: 'platform.admins.update',
  ADMINS_DISABLE: 'platform.admins.disable',

  // Token System Management
  TOKENS_READ: 'platform.tokens.read',
  TOKENS_MANAGE: 'platform.tokens.manage',
  TOKENS_ALLOCATE: 'platform.tokens.allocate',
  TOKENS_ADJUST: 'platform.tokens.adjust',

  // Platform Analytics
  ANALYTICS_READ: 'platform.analytics.read',

  // Centralized Audit Logs
  AUDIT_READ: 'platform.audit.read',

  // Platform Security & Sessions
  SECURITY_READ: 'platform.security.read',
  SECURITY_MANAGE: 'platform.security.manage',

  // Platform Settings & Configuration
  SETTINGS_READ: 'platform.settings.read',
  SETTINGS_MANAGE: 'platform.settings.manage',

  // Platform Support Case Management
  SUPPORT_READ: 'platform.support.read',
  SUPPORT_MANAGE: 'platform.support.manage',
  SUPPORT_ESCALATE: 'platform.support.escalate',

  // Platform Reports & Analytics
  REPORTS_READ: 'platform.reports.read',
  REPORTS_GENERATE: 'platform.reports.generate',
  REPORTS_EXPORT: 'platform.reports.export',

  // Platform Notifications
  NOTIFICATIONS_READ: 'platform.notifications.read',
  NOTIFICATIONS_MANAGE: 'platform.notifications.manage',
} as const;

export type PlatformPermissionKey = (typeof PlatformPermissions)[keyof typeof PlatformPermissions];

export const ALL_PLATFORM_SUPER_ADMIN_PERMISSIONS: string[] = Object.values(PlatformPermissions);
