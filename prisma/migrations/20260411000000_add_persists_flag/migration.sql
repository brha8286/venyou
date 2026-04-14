-- AlterTable
ALTER TABLE "task_templates" ADD COLUMN "persists" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "tasks" ADD COLUMN "persists" BOOLEAN NOT NULL DEFAULT false;
