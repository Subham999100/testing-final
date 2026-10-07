-- CreateEnum
CREATE TYPE "OrgApplicationStatus" AS ENUM ('PENDING_REVIEW', 'MORE_INFO_REQUESTED', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ApplicationPaymentStatus" AS ENUM ('PENDING', 'VERIFIED', 'FAILED');

-- CreateEnum
CREATE TYPE "ApplicationDocumentType" AS ENUM ('REGISTRATION_CERTIFICATE', 'TAX_ID', 'AUTHORIZATION_LETTER', 'PAYMENT_PROOF', 'OTHER');

-- CreateEnum
CREATE TYPE "ApplicationReviewAction" AS ENUM ('SUBMITTED', 'INFO_REQUESTED', 'INFO_SUBMITTED', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "platform_notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "link" TEXT,
    "severity" TEXT NOT NULL DEFAULT 'INFO',
    "metadata" JSONB,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organisation_applications" (
    "id" TEXT NOT NULL,
    "applicationNumber" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "domain" TEXT,
    "contactEmail" TEXT NOT NULL,
    "contactPhone" TEXT,
    "industry" TEXT,
    "companySize" TEXT,
    "website" TEXT,
    "address" TEXT,
    "ownerFirstName" TEXT NOT NULL,
    "ownerLastName" TEXT NOT NULL,
    "ownerEmail" TEXT NOT NULL,
    "ownerPhone" TEXT,
    "ownerDesignation" TEXT,
    "selectedPlanId" TEXT,
    "paymentMethod" TEXT,
    "paymentReference" TEXT,
    "paymentStatus" "ApplicationPaymentStatus" NOT NULL DEFAULT 'PENDING',
    "status" "OrgApplicationStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "rejectionReason" TEXT,
    "requestedInfoNotes" TEXT,
    "applicantResponseNotes" TEXT,
    "reviewedByUserId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdOrganisationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organisation_applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "application_documents" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "type" "ApplicationDocumentType" NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "metadata" JSONB DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "application_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "application_review_history" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "actorId" TEXT,
    "actorRole" TEXT,
    "action" "ApplicationReviewAction" NOT NULL,
    "notes" TEXT,
    "metadata" JSONB DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "application_review_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "platform_notifications_userId_readAt_createdAt_idx" ON "platform_notifications"("userId", "readAt", "createdAt");

-- CreateIndex
CREATE INDEX "platform_notifications_createdAt_idx" ON "platform_notifications"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "organisation_applications_applicationNumber_key" ON "organisation_applications"("applicationNumber");

-- CreateIndex
CREATE UNIQUE INDEX "organisation_applications_createdOrganisationId_key" ON "organisation_applications"("createdOrganisationId");

-- CreateIndex
CREATE INDEX "organisation_applications_status_idx" ON "organisation_applications"("status");

-- CreateIndex
CREATE INDEX "organisation_applications_contactEmail_idx" ON "organisation_applications"("contactEmail");

-- CreateIndex
CREATE INDEX "organisation_applications_ownerEmail_idx" ON "organisation_applications"("ownerEmail");

-- CreateIndex
CREATE INDEX "organisation_applications_slug_idx" ON "organisation_applications"("slug");

-- CreateIndex
CREATE INDEX "organisation_applications_createdAt_idx" ON "organisation_applications"("createdAt");

-- CreateIndex
CREATE INDEX "organisation_applications_reviewedByUserId_idx" ON "organisation_applications"("reviewedByUserId");

-- CreateIndex
CREATE INDEX "organisation_applications_selectedPlanId_idx" ON "organisation_applications"("selectedPlanId");

-- CreateIndex
CREATE INDEX "application_documents_applicationId_idx" ON "application_documents"("applicationId");

-- CreateIndex
CREATE INDEX "application_documents_type_idx" ON "application_documents"("type");

-- CreateIndex
CREATE INDEX "application_documents_createdAt_idx" ON "application_documents"("createdAt");

-- CreateIndex
CREATE INDEX "application_review_history_applicationId_createdAt_idx" ON "application_review_history"("applicationId", "createdAt");

-- CreateIndex
CREATE INDEX "application_review_history_actorId_idx" ON "application_review_history"("actorId");

-- CreateIndex
CREATE INDEX "application_review_history_action_idx" ON "application_review_history"("action");

-- AddForeignKey
ALTER TABLE "organisation_applications" ADD CONSTRAINT "organisation_applications_selectedPlanId_fkey" FOREIGN KEY ("selectedPlanId") REFERENCES "token_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organisation_applications" ADD CONSTRAINT "organisation_applications_reviewedByUserId_fkey" FOREIGN KEY ("reviewedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organisation_applications" ADD CONSTRAINT "organisation_applications_createdOrganisationId_fkey" FOREIGN KEY ("createdOrganisationId") REFERENCES "organisations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_documents" ADD CONSTRAINT "application_documents_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "organisation_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_review_history" ADD CONSTRAINT "application_review_history_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "organisation_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_review_history" ADD CONSTRAINT "application_review_history_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
