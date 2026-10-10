-- DropForeignKey
ALTER TABLE "recruiter_email_recipients" DROP CONSTRAINT "recruiter_email_recipients_batchId_fkey";

-- AddForeignKey
ALTER TABLE "recruiter_email_recipients" ADD CONSTRAINT "recruiter_email_recipients_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "recruiter_email_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
