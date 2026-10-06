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

// ============================================================
// SUPPORT CASE MANAGEMENT TYPES
// ============================================================

export type SupportTicketStatus =
  | 'OPEN'
  | 'IN_PROGRESS'
  | 'WAITING_FOR_USER'
  | 'RESOLVED'
  | 'CLOSED';

export type SupportTicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export type SupportTicketCategory =
  | 'ACCOUNT'
  | 'AUTHENTICATION'
  | 'JOB'
  | 'RECRUITER'
  | 'APPLICATION'
  | 'PAYMENT'
  | 'TECHNICAL'
  | 'OTHER';

export interface SupportMessage {
  id: string;
  ticketId: string;
  authorId: string;
  body: string;
  isInternal: boolean;
  createdAt: string;
  author: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
  };
}

export interface SupportTicket {
  id: string;
  ticketNumber: number;
  organisationId?: string | null;
  createdByUserId: string;
  assignedToUserId?: string | null;
  subject: string;
  description: string;
  status: SupportTicketStatus;
  priority: SupportTicketPriority;
  category: SupportTicketCategory;
  resolutionNotes?: string | null;
  resolvedAt?: string | null;
  closedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  messageCount?: number;
  organisation?: {
    id: string;
    name: string;
    slug: string;
    tier: string;
    contactEmail: string;
  } | null;
  createdByUser: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
  };
  assignedToUser?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
  } | null;
  messages?: SupportMessage[];
}

export interface SupportSummary {
  open: number;
  inProgress: number;
  urgent: number;
  resolved: number;
}

export interface SupportTicketsResponse {
  data: SupportTicket[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  summary: SupportSummary;
}

// ============================================================
// REPORTS & ANALYTICS TYPES
// ============================================================

export interface ReportsOverview {
  timeframe: string;
  startDate?: string | null;
  endDate?: string | null;
  organisationId?: string | null;
  organisations: {
    total: number;
    active: number;
    suspended: number;
    pending: number;
    createdInPeriod: number;
  };
  users: {
    total: number;
    active: number;
    byRole: Array<{ role: string; count: number }>;
  };
  recruiters: {
    total: number;
    active: number;
  };
  jobs: {
    total: number;
    active: number;
    draft: number;
    closed: number;
    createdInPeriod: number;
  };
  applications: {
    total: number;
    appliedInPeriod: number;
    byStage: Array<{ stage: string; count: number }>;
  };
  trends: Array<{
    month: string;
    organisations: number;
    jobs: number;
    applications: number;
  }>;
  topOrganisations: Array<{
    id: string;
    name: string;
    slug: string;
    status: string;
    tier: string;
    recruiters: number;
    jobs: number;
    applications: number;
    createdAt: string;
  }>;
}

export interface PlatformNotificationItem {
  id: string;
  userId?: string | null;
  type: string;
  title: string;
  message: string;
  link?: string | null;
  severity: 'INFO' | 'SUCCESS' | 'WARNING' | 'URGENT';
  metadata?: Record<string, any> | null;
  readAt?: string | null;
  createdAt: string;
}

export interface PlatformNotificationsResponse {
  data: PlatformNotificationItem[];
  meta: {
    total: number;
    totalPages: number;
    page: number;
    limit: number;
  };
  unread: number;
}

