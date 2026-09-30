-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('PLATFORM_SUPER_ADMIN', 'PLATFORM_ADMIN', 'ORGANISATION_SUPER_ADMIN', 'ORGANISATION_ADMIN', 'RECRUITER', 'CANDIDATE');

-- CreateEnum
CREATE TYPE "OrganisationStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'PENDING_VERIFICATION', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "BillingCycle" AS ENUM ('ONE_TIME', 'MONTHLY', 'ANNUAL');

-- CreateEnum
CREATE TYPE "TokenTransactionType" AS ENUM ('PURCHASE', 'ALLOCATION', 'CONSUMPTION', 'REFUND', 'ADJUSTMENT', 'EXPIRATION', 'REVERSAL');

-- CreateEnum
CREATE TYPE "SecuritySeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'CANDIDATE',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isEmailVerified" BOOLEAN NOT NULL DEFAULT false,
    "organisationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_admin_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "department" TEXT,
    "permissions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_admin_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organisations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "domain" TEXT,
    "contactEmail" TEXT NOT NULL,
    "contactPhone" TEXT,
    "status" "OrganisationStatus" NOT NULL DEFAULT 'PENDING_VERIFICATION',
    "suspensionReason" TEXT,
    "suspendedAt" TIMESTAMP(3),
    "suspendedById" TEXT,
    "tier" TEXT NOT NULL DEFAULT 'STANDARD',
    "maxRecruiters" INTEGER NOT NULL DEFAULT 5,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organisations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organisation_metadata" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "industry" TEXT,
    "companySize" TEXT,
    "website" TEXT,
    "logoUrl" TEXT,
    "address" TEXT,
    "billingDetails" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organisation_metadata_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "token_plans" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "tokenAmount" INTEGER NOT NULL,
    "priceCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "billingCycle" "BillingCycle" NOT NULL DEFAULT 'MONTHLY',
    "features" JSONB DEFAULT '[]',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "token_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organisation_token_balances" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "balance" INTEGER NOT NULL DEFAULT 0,
    "allocatedTokens" INTEGER NOT NULL DEFAULT 0,
    "consumedTokens" INTEGER NOT NULL DEFAULT 0,
    "reservedTokens" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organisation_token_balances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "token_transactions" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "actorId" TEXT,
    "type" "TokenTransactionType" NOT NULL,
    "amount" INTEGER NOT NULL,
    "balanceBefore" INTEGER NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "referenceId" TEXT,
    "reason" TEXT,
    "metadata" JSONB DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "token_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "token_allocation_limits" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "monthlyMaxAllocation" INTEGER NOT NULL DEFAULT 10000,
    "singleTxLimit" INTEGER NOT NULL DEFAULT 5000,
    "autoRechargeEnabled" BOOLEAN NOT NULL DEFAULT false,
    "autoRechargeThreshold" INTEGER NOT NULL DEFAULT 500,
    "autoRechargeAmount" INTEGER NOT NULL DEFAULT 2000,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "token_allocation_limits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "actorRole" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "organisationId" TEXT,
    "metadata" JSONB DEFAULT '{}',
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "security_events" (
    "id" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "severity" "SecuritySeverity" NOT NULL DEFAULT 'MEDIUM',
    "actorId" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "details" JSONB DEFAULT '{}',
    "isResolved" BOOLEAN NOT NULL DEFAULT false,
    "resolvedAt" TIMESTAMP(3),
    "resolvedById" TEXT,
    "resolutionNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "security_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_settings" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'GENERAL',
    "description" TEXT,
    "isEncrypted" BOOLEAN NOT NULL DEFAULT false,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "updatedById" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "users_organisationId_idx" ON "users"("organisationId");

-- CreateIndex
CREATE INDEX "users_isActive_idx" ON "users"("isActive");

-- CreateIndex
CREATE INDEX "users_createdAt_idx" ON "users"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "platform_admin_profiles_userId_key" ON "platform_admin_profiles"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "platform_sessions_tokenHash_key" ON "platform_sessions"("tokenHash");

-- CreateIndex
CREATE INDEX "platform_sessions_userId_idx" ON "platform_sessions"("userId");

-- CreateIndex
CREATE INDEX "platform_sessions_expiresAt_idx" ON "platform_sessions"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "organisations_slug_key" ON "organisations"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "organisations_domain_key" ON "organisations"("domain");

-- CreateIndex
CREATE INDEX "organisations_status_idx" ON "organisations"("status");

-- CreateIndex
CREATE INDEX "organisations_slug_idx" ON "organisations"("slug");

-- CreateIndex
CREATE INDEX "organisations_domain_idx" ON "organisations"("domain");

-- CreateIndex
CREATE INDEX "organisations_createdAt_idx" ON "organisations"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "organisation_metadata_organisationId_key" ON "organisation_metadata"("organisationId");

-- CreateIndex
CREATE UNIQUE INDEX "token_plans_code_key" ON "token_plans"("code");

-- CreateIndex
CREATE INDEX "token_plans_isActive_idx" ON "token_plans"("isActive");

-- CreateIndex
CREATE INDEX "token_plans_code_idx" ON "token_plans"("code");

-- CreateIndex
CREATE UNIQUE INDEX "organisation_token_balances_organisationId_key" ON "organisation_token_balances"("organisationId");

-- CreateIndex
CREATE INDEX "token_transactions_organisationId_idx" ON "token_transactions"("organisationId");

-- CreateIndex
CREATE INDEX "token_transactions_type_idx" ON "token_transactions"("type");

-- CreateIndex
CREATE INDEX "token_transactions_createdAt_idx" ON "token_transactions"("createdAt");

-- CreateIndex
CREATE INDEX "token_transactions_actorId_idx" ON "token_transactions"("actorId");

-- CreateIndex
CREATE UNIQUE INDEX "token_allocation_limits_organisationId_key" ON "token_allocation_limits"("organisationId");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_entityType_entityId_idx" ON "audit_logs"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "audit_logs_actorId_idx" ON "audit_logs"("actorId");

-- CreateIndex
CREATE INDEX "audit_logs_organisationId_idx" ON "audit_logs"("organisationId");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- CreateIndex
CREATE INDEX "security_events_eventType_idx" ON "security_events"("eventType");

-- CreateIndex
CREATE INDEX "security_events_severity_idx" ON "security_events"("severity");

-- CreateIndex
CREATE INDEX "security_events_isResolved_idx" ON "security_events"("isResolved");

-- CreateIndex
CREATE INDEX "security_events_createdAt_idx" ON "security_events"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "platform_settings_key_key" ON "platform_settings"("key");

-- CreateIndex
CREATE INDEX "platform_settings_category_idx" ON "platform_settings"("category");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "organisations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_admin_profiles" ADD CONSTRAINT "platform_admin_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_sessions" ADD CONSTRAINT "platform_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organisation_metadata" ADD CONSTRAINT "organisation_metadata_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organisation_token_balances" ADD CONSTRAINT "organisation_token_balances_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "token_transactions" ADD CONSTRAINT "token_transactions_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "token_transactions" ADD CONSTRAINT "token_transactions_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "token_allocation_limits" ADD CONSTRAINT "token_allocation_limits_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "organisations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "security_events" ADD CONSTRAINT "security_events_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
