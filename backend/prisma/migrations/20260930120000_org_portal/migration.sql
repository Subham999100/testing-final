-- CreateEnum
CREATE TYPE "OrgMemberStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'REMOVED');

-- CreateEnum
CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('DRAFT', 'IN_REVIEW', 'PUBLISHED', 'PAUSED', 'CLOSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "WorkMode" AS ENUM ('ONSITE', 'REMOTE', 'HYBRID');

-- CreateEnum
CREATE TYPE "EmploymentType" AS ENUM ('FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP');

-- CreateEnum
CREATE TYPE "ApplicationStage" AS ENUM ('APPLIED', 'SCREENING', 'SHORTLISTED', 'INTERVIEW', 'OFFER', 'HIRED', 'REJECTED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "InterviewMode" AS ENUM ('VIDEO', 'PHONE', 'ONSITE');

-- CreateEnum
CREATE TYPE "InterviewStatus" AS ENUM ('SCHEDULED', 'FEEDBACK_PENDING', 'COMPLETED', 'CANCELLED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "FeedbackRecommendation" AS ENUM ('STRONG_YES', 'YES', 'NO', 'STRONG_NO');

-- CreateEnum
CREATE TYPE "OfferStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "MemberTokenEntryType" AS ENUM ('ALLOCATE', 'DEALLOCATE', 'CONSUME', 'REFUND');

-- CreateEnum
CREATE TYPE "TokenReservationStatus" AS ENUM ('HELD', 'COMMITTED', 'RELEASED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('CREATED', 'PAID', 'FAILED');

-- CreateEnum
CREATE TYPE "AiRunStatus" AS ENUM ('SUCCEEDED', 'FAILED');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('OPEN', 'DONE');

-- AlterTable
ALTER TABLE "token_transactions" ADD COLUMN     "idempotencyKey" TEXT;

-- CreateTable
CREATE TABLE "org_member_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "status" "OrgMemberStatus" NOT NULL DEFAULT 'ACTIVE',
    "permissions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "title" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "mutedNotificationTypes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "invitedById" TEXT,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "org_member_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "org_settings" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "jobApprovalRequired" BOOLEAN NOT NULL DEFAULT false,
    "offerApprovalRequired" BOOLEAN NOT NULL DEFAULT true,
    "rejectReasonRequired" BOOLEAN NOT NULL DEFAULT true,
    "messageOversight" BOOLEAN NOT NULL DEFAULT false,
    "aiEnabled" BOOLEAN NOT NULL DEFAULT true,
    "lowBalanceThreshold" INTEGER NOT NULL DEFAULT 200,
    "tokenConfirmThreshold" INTEGER NOT NULL DEFAULT 20,
    "updatedById" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "org_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "org_invitations" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "permissions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "tokenHash" TEXT NOT NULL,
    "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "invitedById" TEXT NOT NULL,
    "acceptedUserId" TEXT,
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "org_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jobs" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "responsibilities" TEXT,
    "requiredSkills" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "preferredSkills" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "experienceMin" INTEGER,
    "experienceMax" INTEGER,
    "salaryMin" INTEGER,
    "salaryMax" INTEGER,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "location" TEXT,
    "workMode" "WorkMode" NOT NULL DEFAULT 'ONSITE',
    "employmentType" "EmploymentType" NOT NULL DEFAULT 'FULL_TIME',
    "education" TEXT,
    "industry" TEXT,
    "department" TEXT,
    "openings" INTEGER NOT NULL DEFAULT 1,
    "deadline" TIMESTAMP(3),
    "screeningQuestions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "JobStatus" NOT NULL DEFAULT 'DRAFT',
    "reviewNote" TEXT,
    "createdById" TEXT NOT NULL,
    "approvedById" TEXT,
    "publishedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_assignments" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "job_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidates" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "headline" TEXT,
    "location" TEXT,
    "experienceYears" INTEGER,
    "currentCompany" TEXT,
    "skills" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "resumeText" TEXT,
    "resumeUrl" TEXT,
    "source" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "candidates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidate_notes" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "applicationId" TEXT,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "candidate_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saved_candidates" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "saved_candidates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "applications" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "stage" "ApplicationStage" NOT NULL DEFAULT 'APPLIED',
    "assignedToId" TEXT,
    "rejectReason" TEXT,
    "matchScore" INTEGER,
    "source" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "application_stage_history" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "fromStage" "ApplicationStage",
    "toStage" "ApplicationStage" NOT NULL,
    "actorId" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "application_stage_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interviews" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "durationMinutes" INTEGER NOT NULL DEFAULT 45,
    "mode" "InterviewMode" NOT NULL DEFAULT 'VIDEO',
    "location" TEXT,
    "status" "InterviewStatus" NOT NULL DEFAULT 'SCHEDULED',
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "interviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interview_interviewers" (
    "id" TEXT NOT NULL,
    "interviewId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "interview_interviewers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interview_feedback" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "interviewId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "recommendation" "FeedbackRecommendation" NOT NULL,
    "strengths" TEXT,
    "concerns" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "interview_feedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "offers" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "salary" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "joiningDate" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "notes" TEXT,
    "status" "OfferStatus" NOT NULL DEFAULT 'DRAFT',
    "createdById" TEXT NOT NULL,
    "approvedById" TEXT,
    "sentAt" TIMESTAMP(3),
    "respondedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "offers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "offer_history" (
    "id" TEXT NOT NULL,
    "offerId" TEXT NOT NULL,
    "fromStatus" "OfferStatus",
    "toStatus" "OfferStatus" NOT NULL,
    "actorId" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "offer_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "token_allocations" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "allocated" INTEGER NOT NULL DEFAULT 0,
    "consumed" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "token_allocations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "member_token_entries" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "type" "MemberTokenEntryType" NOT NULL,
    "amount" INTEGER NOT NULL,
    "reason" TEXT,
    "referenceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "member_token_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "token_reservations" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "feature" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "fromAllocation" BOOLEAN NOT NULL DEFAULT false,
    "status" "TokenReservationStatus" NOT NULL DEFAULT 'HELD',
    "idempotencyKey" TEXT NOT NULL,
    "referenceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "token_reservations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "org_payments" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "planName" TEXT NOT NULL,
    "tokens" INTEGER NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'CREATED',
    "razorpayOrderId" TEXT NOT NULL,
    "razorpayPaymentId" TEXT,
    "invoiceNumber" TEXT,
    "failureReason" TEXT,
    "createdById" TEXT NOT NULL,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "org_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_runs" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "feature" TEXT NOT NULL,
    "status" "AiRunStatus" NOT NULL,
    "tokens" INTEGER NOT NULL,
    "referenceId" TEXT,
    "output" JSONB,
    "explanation" JSONB,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidate_messages" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "subject" TEXT,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "candidate_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "org_notifications" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "link" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "org_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "org_tasks" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "dueAt" TIMESTAMP(3),
    "status" "TaskStatus" NOT NULL DEFAULT 'OPEN',
    "assigneeId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "relatedType" TEXT,
    "relatedId" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "org_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "org_integrations" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "encryptedSecret" TEXT NOT NULL,
    "secretLast4" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "updatedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "org_integrations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "org_member_profiles_userId_key" ON "org_member_profiles"("userId");

-- CreateIndex
CREATE INDEX "org_member_profiles_organisationId_status_idx" ON "org_member_profiles"("organisationId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "org_settings_organisationId_key" ON "org_settings"("organisationId");

-- CreateIndex
CREATE UNIQUE INDEX "org_invitations_tokenHash_key" ON "org_invitations"("tokenHash");

-- CreateIndex
CREATE INDEX "org_invitations_organisationId_status_idx" ON "org_invitations"("organisationId", "status");

-- CreateIndex
CREATE INDEX "org_invitations_email_idx" ON "org_invitations"("email");

-- CreateIndex
CREATE INDEX "jobs_organisationId_status_idx" ON "jobs"("organisationId", "status");

-- CreateIndex
CREATE INDEX "jobs_organisationId_createdById_idx" ON "jobs"("organisationId", "createdById");

-- CreateIndex
CREATE INDEX "job_assignments_organisationId_userId_idx" ON "job_assignments"("organisationId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "job_assignments_jobId_userId_key" ON "job_assignments"("jobId", "userId");

-- CreateIndex
CREATE INDEX "candidates_organisationId_createdAt_idx" ON "candidates"("organisationId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "candidates_organisationId_email_key" ON "candidates"("organisationId", "email");

-- CreateIndex
CREATE INDEX "candidate_notes_organisationId_candidateId_idx" ON "candidate_notes"("organisationId", "candidateId");

-- CreateIndex
CREATE INDEX "saved_candidates_organisationId_userId_idx" ON "saved_candidates"("organisationId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "saved_candidates_userId_candidateId_key" ON "saved_candidates"("userId", "candidateId");

-- CreateIndex
CREATE INDEX "applications_organisationId_stage_idx" ON "applications"("organisationId", "stage");

-- CreateIndex
CREATE INDEX "applications_organisationId_jobId_idx" ON "applications"("organisationId", "jobId");

-- CreateIndex
CREATE INDEX "applications_organisationId_assignedToId_idx" ON "applications"("organisationId", "assignedToId");

-- CreateIndex
CREATE UNIQUE INDEX "applications_jobId_candidateId_key" ON "applications"("jobId", "candidateId");

-- CreateIndex
CREATE INDEX "application_stage_history_organisationId_createdAt_idx" ON "application_stage_history"("organisationId", "createdAt");

-- CreateIndex
CREATE INDEX "application_stage_history_applicationId_idx" ON "application_stage_history"("applicationId");

-- CreateIndex
CREATE INDEX "interviews_organisationId_scheduledAt_idx" ON "interviews"("organisationId", "scheduledAt");

-- CreateIndex
CREATE INDEX "interviews_applicationId_idx" ON "interviews"("applicationId");

-- CreateIndex
CREATE INDEX "interview_interviewers_userId_idx" ON "interview_interviewers"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "interview_interviewers_interviewId_userId_key" ON "interview_interviewers"("interviewId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "interview_feedback_interviewId_authorId_key" ON "interview_feedback"("interviewId", "authorId");

-- CreateIndex
CREATE INDEX "offers_organisationId_status_idx" ON "offers"("organisationId", "status");

-- CreateIndex
CREATE INDEX "offers_applicationId_idx" ON "offers"("applicationId");

-- CreateIndex
CREATE INDEX "offer_history_offerId_idx" ON "offer_history"("offerId");

-- CreateIndex
CREATE UNIQUE INDEX "token_allocations_organisationId_userId_key" ON "token_allocations"("organisationId", "userId");

-- CreateIndex
CREATE INDEX "member_token_entries_organisationId_userId_createdAt_idx" ON "member_token_entries"("organisationId", "userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "token_reservations_idempotencyKey_key" ON "token_reservations"("idempotencyKey");

-- CreateIndex
CREATE INDEX "token_reservations_organisationId_status_idx" ON "token_reservations"("organisationId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "org_payments_razorpayOrderId_key" ON "org_payments"("razorpayOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "org_payments_razorpayPaymentId_key" ON "org_payments"("razorpayPaymentId");

-- CreateIndex
CREATE UNIQUE INDEX "org_payments_invoiceNumber_key" ON "org_payments"("invoiceNumber");

-- CreateIndex
CREATE INDEX "org_payments_organisationId_createdAt_idx" ON "org_payments"("organisationId", "createdAt");

-- CreateIndex
CREATE INDEX "ai_runs_organisationId_createdAt_idx" ON "ai_runs"("organisationId", "createdAt");

-- CreateIndex
CREATE INDEX "candidate_messages_organisationId_candidateId_createdAt_idx" ON "candidate_messages"("organisationId", "candidateId", "createdAt");

-- CreateIndex
CREATE INDEX "org_notifications_userId_readAt_createdAt_idx" ON "org_notifications"("userId", "readAt", "createdAt");

-- CreateIndex
CREATE INDEX "org_tasks_organisationId_assigneeId_status_idx" ON "org_tasks"("organisationId", "assigneeId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "org_integrations_organisationId_provider_key" ON "org_integrations"("organisationId", "provider");

-- CreateIndex
CREATE UNIQUE INDEX "token_transactions_idempotencyKey_key" ON "token_transactions"("idempotencyKey");

-- AddForeignKey
ALTER TABLE "org_member_profiles" ADD CONSTRAINT "org_member_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_assignments" ADD CONSTRAINT "job_assignments_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_notes" ADD CONSTRAINT "candidate_notes_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "candidates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_candidates" ADD CONSTRAINT "saved_candidates_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "candidates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "jobs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "candidates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_stage_history" ADD CONSTRAINT "application_stage_history_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interviews" ADD CONSTRAINT "interviews_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interview_interviewers" ADD CONSTRAINT "interview_interviewers_interviewId_fkey" FOREIGN KEY ("interviewId") REFERENCES "interviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interview_feedback" ADD CONSTRAINT "interview_feedback_interviewId_fkey" FOREIGN KEY ("interviewId") REFERENCES "interviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offers" ADD CONSTRAINT "offers_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offer_history" ADD CONSTRAINT "offer_history_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "offers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_messages" ADD CONSTRAINT "candidate_messages_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "candidates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Org portal safety net: member allocations can never be negative or overspent.
ALTER TABLE "token_allocations" ADD CONSTRAINT "token_allocations_non_negative" CHECK ("allocated" >= 0 AND "consumed" >= 0);
ALTER TABLE "token_allocations" ADD CONSTRAINT "token_allocations_not_overspent" CHECK ("consumed" <= "allocated");

