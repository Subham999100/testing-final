ALTER TABLE "recruiter_profiles" ADD COLUMN "searchDetails" JSONB NOT NULL DEFAULT '{}';
CREATE TABLE "recruiter_email_batches" (
 "id" TEXT PRIMARY KEY, "organisationId" TEXT NOT NULL, "userId" TEXT NOT NULL,
 "requestId" TEXT NOT NULL UNIQUE, "subject" TEXT NOT NULL, "body" TEXT NOT NULL,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE INDEX "recruiter_email_batches_organisationId_userId_createdAt_idx" ON "recruiter_email_batches"("organisationId", "userId", "createdAt");
CREATE TABLE "recruiter_email_recipients" (
 "id" TEXT PRIMARY KEY, "batchId" TEXT NOT NULL REFERENCES "recruiter_email_batches"("id") ON DELETE CASCADE,
 "candidateId" TEXT NOT NULL, "status" TEXT NOT NULL DEFAULT 'PENDING', "detail" TEXT, "updatedAt" TIMESTAMP(3) NOT NULL,
 UNIQUE("batchId", "candidateId"));
CREATE INDEX "recruiter_email_recipients_batchId_status_idx" ON "recruiter_email_recipients"("batchId", "status");
