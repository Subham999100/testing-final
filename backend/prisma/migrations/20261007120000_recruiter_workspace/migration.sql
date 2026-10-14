-- CreateTable
CREATE TABLE "recruiter_profiles" (
    "candidateId" TEXT NOT NULL,
    "summary" TEXT NOT NULL DEFAULT '',
    "designation" TEXT NOT NULL DEFAULT '',
    "industry" TEXT NOT NULL DEFAULT '',
    "experienceMonths" INTEGER NOT NULL DEFAULT 0,
    "currentSalary" INTEGER,
    "expectedSalary" INTEGER,
    "noticePeriodDays" INTEGER,
    "preferredLocations" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "employmentPreference" TEXT NOT NULL DEFAULT '',
    "workPreference" TEXT NOT NULL DEFAULT '',
    "employment" JSONB NOT NULL DEFAULT '[]',
    "education" JSONB NOT NULL DEFAULT '[]',
    "certifications" JSONB NOT NULL DEFAULT '[]',
    "itSkills" JSONB NOT NULL DEFAULT '[]',
    "lastActiveAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recruiter_profiles_pkey" PRIMARY KEY ("candidateId")
);

-- CreateTable
CREATE TABLE "recruiter_visits" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "lastViewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recruiter_visits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recruiter_folders" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recruiter_folders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recruiter_folder_candidates" (
    "id" TEXT NOT NULL,
    "folderId" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recruiter_folder_candidates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recruiter_saved_searches" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shared" BOOLEAN NOT NULL DEFAULT false,
    "filters" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recruiter_saved_searches_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "recruiter_visits_organisationId_candidateId_lastViewedAt_idx" ON "recruiter_visits"("organisationId", "candidateId", "lastViewedAt");

-- CreateIndex
CREATE UNIQUE INDEX "recruiter_visits_userId_candidateId_key" ON "recruiter_visits"("userId", "candidateId");

-- CreateIndex
CREATE INDEX "recruiter_folders_organisationId_userId_idx" ON "recruiter_folders"("organisationId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "recruiter_folder_candidates_folderId_candidateId_key" ON "recruiter_folder_candidates"("folderId", "candidateId");

-- CreateIndex
CREATE INDEX "recruiter_saved_searches_organisationId_userId_idx" ON "recruiter_saved_searches"("organisationId", "userId");

-- AddForeignKey
ALTER TABLE "recruiter_profiles" ADD CONSTRAINT "recruiter_profiles_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "candidates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recruiter_visits" ADD CONSTRAINT "recruiter_visits_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "candidates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recruiter_folder_candidates" ADD CONSTRAINT "recruiter_folder_candidates_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "recruiter_folders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recruiter_folder_candidates" ADD CONSTRAINT "recruiter_folder_candidates_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "candidates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

