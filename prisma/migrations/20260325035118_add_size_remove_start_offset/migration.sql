/*
  Warnings:

  - You are about to drop the column `start_offset_days` on the `task_templates` table. All the data in the column will be lost.
  - You are about to drop the column `start_date` on the `tasks` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "task_templates" DROP COLUMN "start_offset_days",
ADD COLUMN     "size" TEXT;

-- AlterTable
ALTER TABLE "tasks" DROP COLUMN "start_date",
ADD COLUMN     "size" TEXT;
