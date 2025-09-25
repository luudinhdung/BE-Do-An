/*
  Warnings:

  - Added the required column `hashedUserKey` to the `Chat` table without a default value. This is not possible if the table is not empty.
  - Added the required column `serverKey` to the `Chat` table without a default value. This is not possible if the table is not empty.
  - Added the required column `data` to the `Message` table without a default value. This is not possible if the table is not empty.
  - Added the required column `iv` to the `Message` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Chat" ADD COLUMN     "hashedUserKey" TEXT NOT NULL,
ADD COLUMN     "serverKey" TEXT NOT NULL,
ALTER COLUMN "durationTime" DROP NOT NULL,
ALTER COLUMN "durationTime" DROP DEFAULT,
ALTER COLUMN "durationTime" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "data" TEXT NOT NULL,
ADD COLUMN     "iv" TEXT NOT NULL;
