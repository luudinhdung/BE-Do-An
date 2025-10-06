/*
  Warnings:

  - A unique constraint covering the columns `[type]` on the table `PricingRule` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `type` to the `Transaction` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('DEPOSIT', 'WITHDRAW', 'MESSAGE');

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "type" "TransactionType" NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "PricingRule_type_key" ON "PricingRule"("type");
