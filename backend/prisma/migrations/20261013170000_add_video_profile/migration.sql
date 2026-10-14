-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "CandidateVideoMode" AS ENUM ('NONE', 'PROFILE', 'INTERVIEW');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "VideoAnalysisStatus" AS ENUM ('NOT_STARTED', 'PROCESSING', 'COMPLETED', 'FAILED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AlterTable
ALTER TABLE "candidate_profiles" ADD COLUMN IF NOT EXISTS "videoMode" "CandidateVideoMode" NOT NULL DEFAULT 'NONE';

-- CreateTable
CREATE TABLE IF NOT EXISTS "candidate_video_profiles" (
    "id" TEXT NOT NULL,
    "candidateProfileId" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "durationSeconds" DOUBLE PRECISION NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "thumbnailKey" TEXT,
    "consentGivenAt" TIMESTAMP(3),
    "analysisStatus" "VideoAnalysisStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "transcript" TEXT,
    "fluencyScore" DOUBLE PRECISION,
    "communicationScore" DOUBLE PRECISION,
    "grammarScore" DOUBLE PRECISION,
    "metrics" JSONB DEFAULT '{}',
    "analysisSummary" JSONB DEFAULT '{}',
    "snapshotKeys" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "reportPdfKey" TEXT,
    "analyzedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "candidate_video_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "candidate_video_profiles_candidateProfileId_key" ON "candidate_video_profiles"("candidateProfileId");

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "candidate_video_profiles" ADD CONSTRAINT "candidate_video_profiles_candidateProfileId_fkey" FOREIGN KEY ("candidateProfileId") REFERENCES "candidate_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
