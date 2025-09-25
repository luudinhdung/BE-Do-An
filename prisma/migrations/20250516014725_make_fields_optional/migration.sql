-- AlterTable
ALTER TABLE "Chat" ADD COLUMN     "hashedUserKey" TEXT,
ADD COLUMN     "serverKey" TEXT;

-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "data" TEXT,
ADD COLUMN     "iv" TEXT;
