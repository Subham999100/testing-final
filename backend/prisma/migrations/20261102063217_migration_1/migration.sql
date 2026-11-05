-- CreateEnum
CREATE TYPE "OnboardingStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETE');

-- CreateEnum
CREATE TYPE "VideoInterviewStatus" AS ENUM ('NOT_STARTED', 'SKIPPED', 'IN_PROGRESS', 'COMPLETED');

-- DropIndex
DROP INDEX "candidate_profiles_searchable_text_trgm_idx";

-- AlterTable
ALTER TABLE "candidate_profiles" ADD COLUMN     "certifications" JSONB DEFAULT '[]',
ADD COLUMN     "completionBreakdown" JSONB DEFAULT '{}',
ADD COLUMN     "completionScore" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "currentJobTitle" TEXT,
ADD COLUMN     "currentSalary" BIGINT,
ADD COLUMN     "dateOfBirth" TIMESTAMP(3),
ADD COLUMN     "expectedSalary" BIGINT,
ADD COLUMN     "experienceMonths" INTEGER DEFAULT 0,
ADD COLUMN     "gender" TEXT,
ADD COLUMN     "isFresher" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "languages" JSONB DEFAULT '[]',
ADD COLUMN     "noticePeriod" TEXT,
ADD COLUMN     "onboardingStatus" "OnboardingStatus" NOT NULL DEFAULT 'NOT_STARTED',
ADD COLUMN     "onboardingStep" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "phoneCountryCode" TEXT DEFAULT '+91',
ADD COLUMN     "photoStorageKey" TEXT,
ADD COLUMN     "photoUrl" TEXT,
ADD COLUMN     "preferredJobTypes" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "preferredLocations" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "preferredWorkModes" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "projects" JSONB DEFAULT '[]',
ADD COLUMN     "rawParsedResume" JSONB,
ADD COLUMN     "resumeParseStatus" TEXT DEFAULT 'NONE',
ADD COLUMN     "socialLinks" JSONB DEFAULT '{}',
ADD COLUMN     "videoInterviewStatus" "VideoInterviewStatus" NOT NULL DEFAULT 'NOT_STARTED';

-- AlterTable
ALTER TABLE "candidates" ALTER COLUMN "lastName" DROP NOT NULL;

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "lastName" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "candidate_profiles_onboardingStatus_idx" ON "candidate_profiles"("onboardingStatus");
