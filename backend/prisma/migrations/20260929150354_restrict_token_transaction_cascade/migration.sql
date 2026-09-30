-- DropForeignKey
ALTER TABLE "token_transactions" DROP CONSTRAINT "token_transactions_organisationId_fkey";

-- AddForeignKey
ALTER TABLE "token_transactions" ADD CONSTRAINT "token_transactions_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "organisations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
