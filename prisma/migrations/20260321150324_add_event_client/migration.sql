-- AlterTable
ALTER TABLE "events" ADD COLUMN     "client_id" UUID;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
