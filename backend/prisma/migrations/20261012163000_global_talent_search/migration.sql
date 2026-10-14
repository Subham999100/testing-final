-- AlterTable
ALTER TABLE "candidate_profiles" 
    ADD COLUMN "visibleToRecruiters" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN "blockedOrganisations" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    ADD COLUMN "searchableText" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "candidates_organisationId_userId_key" ON "candidates"("organisationId", "userId");

-- CreateIndex
CREATE INDEX "candidate_profiles_skills_idx" ON "candidate_profiles" USING GIN ("skills");

-- EnableExtension
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- CreateIndex
CREATE INDEX "candidate_profiles_searchable_text_trgm_idx" ON "candidate_profiles" USING GIN ("searchableText" gin_trgm_ops);
