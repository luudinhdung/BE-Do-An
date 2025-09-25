/*
  Warnings:

  - You are about to drop the column `screenshot` on the `Feedback` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Feedback" DROP COLUMN "screenshot",
ADD COLUMN     "screenshots" TEXT[];

