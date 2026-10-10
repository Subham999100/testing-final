-- CreateTable
CREATE TABLE "recruiter_downloads" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "downloadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recruiter_downloads_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "recruiter_downloads_userId_candidateId_key" ON "recruiter_downloads"("userId", "candidateId");

-- CreateIndex
CREATE INDEX "recruiter_downloads_organisationId_candidateId_downloadedAt_idx" ON "recruiter_downloads"("organisationId", "candidateId", "downloadedAt");

-- AddForeignKey
ALTER TABLE "recruiter_downloads" ADD CONSTRAINT "recruiter_downloads_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "candidates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
