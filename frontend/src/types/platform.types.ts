// ============================================================
// Clyptus Job Portal - Frontend Platform Super Admin Types
// ============================================================

export type OrganisationStatus =
  | 'ACTIVE'
  | 'SUSPENDED'
  | 'PENDING_VERIFICATION'
  | 'ARCHIVED'
  | 'REJECTED'
  | 'MORE_INFORMATION_REQUIRED';

export type UserRole =
  | 'PLATFORM_SUPER_ADMIN'
  | 'PLATFORM_ADMIN'
  | 'ORGANISATION_SUPER_ADMIN'
  | 'ORGANISATION_ADMIN'
  | 'RECRUITER'
  | 'CANDIDATE';

export type TokenTransactionType =
  'PURCHASE' | 'ALLOCATION' | 'CONSUMPTION' | 'REFUND' | 'ADJUSTMENT' | 'EXPIRATION' | 'REVERSAL';

export type SecuritySeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface Organisation {
  id: string;
  name: string;
  slug: string;
  domain?: string | null;
  contactEmail: string;
  contactPhone?: string | null;
  status: OrganisationStatus;
  suspensionReason?: string | null;
  suspendedAt?: string | null;
  tier: string;
  maxRecruiters: number;
  createdAt: string;
  updatedAt: string;
  membersCount: number;
  tokenBalance: number;
  allocatedTokens: number;
  consumedTokens: number;
  industry?: string | null;
  companySize?: string | null;
  website?: string | null;
}

export interface PlatformAdminUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  platformAdminProfile?: {
    department?: string | null;
    permissions?: string[];
    notes?: string | null;
    isActive?: boolean;
  } | null;
}

export interface TokenPlan {
  id: string;
  name: string;
  code: string;
  description?: string | null;
  tokenAmount: number;
  priceCents: number;
  currency: string;
  billingCycle: 'ONE_TIME' | 'MONTHLY' | 'ANNUAL';
  features: string[];
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
}

export interface TokenTransaction {
  id: string;
  organisationId: string;
  organisationName?: string;
  organisationSlug?: string;
  actorId?: string | null;
  actorEmail?: string | null;
  type: TokenTransactionType;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  referenceId?: string | null;
  reason?: string | null;
  createdAt: string;
}

export interface AuditLogItem {
  id: string;
  actorId?: string | null;
  actorRole: string;
  action: string;
  entityType: string;
  entityId: string;
  organisationId?: string | null;
  organisationName?: string | null;
  metadata?: Record<string, any>;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: string;
  actor?: {
    email: string;
    firstName: string;
    lastName: string;
  } | null;
}

export interface SecurityEvent {
  id: string;
  eventType: string;
  severity: SecuritySeverity;
  actorId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  details?: Record<string, any>;
  isResolved: boolean;
  resolvedAt?: string | null;
  resolutionNotes?: string | null;
  createdAt: string;
}

export interface PlatformSetting {
  id: string;
  key: string;
  value: any;
  category: string;
  description?: string | null;
  isEncrypted: boolean;
  isPublic: boolean;
  updatedAt: string;
}

export interface PlatformDashboardSummary {
  metrics: {
    totalOrganisations: number;
    activeOrganisations: number;
    suspendedOrganisations: number;
    pendingOrganisations: number;
    totalPlatformUsers: number;
    totalPlatformAdmins: number;
    tokenMetrics: {
      totalActiveTokens: number;
      totalAllocatedTokens: number;
      totalConsumedTokens: number;
    };
  };
  recentOrganisations: Organisation[];
  recentTransactions: TokenTransaction[];
  recentSecurityEvents: SecurityEvent[];
  recentAuditLogs: AuditLogItem[];
  systemHealth: {
    status: 'HEALTHY' | 'DEGRADED' | 'DOWN';
    timestamp: string;
    uptimeSeconds: number;
    services: Record<string, any>;
  };
}

export type HealthStatus = 'HEALTHY' | 'DEGRADED' | 'DOWN' | 'NOT_CONFIGURED';

export interface ComponentHealth {
  status: HealthStatus;
  latencyMs?: number;
  info?: string;
  error?: string;
}

export interface PlatformMonitoringOverview {
  overallStatus: HealthStatus;
  checkedAt: string;
  process: {
    uptimeSeconds: number;
    nodeVersion: string;
    environment: string;
    memory: {
      heapUsedMB: number;
      heapTotalMB: number;
      rssMB: number;
    };
  };
  services: {
    api: ComponentHealth;
    postgresql: ComponentHealth;
    redis: ComponentHealth;
    queues: ComponentHealth;
  };
  security: {
    totalEvents: number;
    unresolvedEvents: number;
    criticalIncidents: number;
    activeSessions: number;
  };
  operations: {
    auditLogs24h: number;
    totalOrganisations: number;
    activeOrganisations: number;
  };
  recentSecurityEvents: Array<{
    id: string;
    eventType: string;
    severity: SecuritySeverity;
    isResolved: boolean;
    createdAt: string;
    ipAddress?: string | null;
  }>;
  recentAuditLogs: Array<{
    id: string;
    action: string;
    actorRole?: string | null;
    createdAt: string;
  }>;
}

