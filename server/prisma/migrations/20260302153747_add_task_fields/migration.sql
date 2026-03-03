/*
  Warnings:

  - You are about to drop the column `parentTaskId` on the `Task` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Task" DROP CONSTRAINT "Task_parentTaskId_fkey";

-- AlterTable
ALTER TABLE "Task" DROP COLUMN "parentTaskId",
ADD COLUMN     "assigneeId" TEXT,
ADD COLUMN     "fileName" TEXT,
ADD COLUMN     "fileUrl" TEXT,
ADD COLUMN     "type" TEXT DEFAULT 'GENERAL';

-- CreateTable
CREATE TABLE "_TaskCollaborators" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_TaskCollaborators_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_TaskCollaborators_B_index" ON "_TaskCollaborators"("B");

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_TaskCollaborators" ADD CONSTRAINT "_TaskCollaborators_A_fkey" FOREIGN KEY ("A") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_TaskCollaborators" ADD CONSTRAINT "_TaskCollaborators_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
