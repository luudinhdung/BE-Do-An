/*
  Warnings:

  - You are about to drop the column `hashedUserKey` on the `Chat` table. All the data in the column will be lost.
  - You are about to drop the column `serverKey` on the `Chat` table. All the data in the column will be lost.
  - You are about to drop the column `data` on the `Message` table. All the data in the column will be lost.
  - You are about to drop the column `iv` on the `Message` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Chat" DROP COLUMN "hashedUserKey",
DROP COLUMN "serverKey";

-- AlterTable
ALTER TABLE "Message" DROP COLUMN "data",
DROP COLUMN "iv";
