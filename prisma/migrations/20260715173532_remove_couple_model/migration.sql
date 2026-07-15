/*
  Warnings:

  - You are about to drop the column `coupleId` on the `Expense` table. All the data in the column will be lost.
  - You are about to drop the column `coupleId` on the `Payment` table. All the data in the column will be lost.
  - You are about to drop the column `coupleId` on the `User` table. All the data in the column will be lost.
  - You are about to drop the `Couple` table. If the table is not empty, all the data it contains will be lost.
  - Made the column `groupId` on table `Expense` required. This step will fail if there are existing NULL values in that column.
  - Made the column `groupId` on table `Payment` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "Expense" DROP CONSTRAINT "Expense_coupleId_fkey";

-- DropForeignKey
ALTER TABLE "Expense" DROP CONSTRAINT "Expense_groupId_fkey";

-- DropForeignKey
ALTER TABLE "Payment" DROP CONSTRAINT "Payment_coupleId_fkey";

-- DropForeignKey
ALTER TABLE "Payment" DROP CONSTRAINT "Payment_groupId_fkey";

-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_coupleId_fkey";

-- DropIndex
DROP INDEX "Payment_coupleId_idx";

-- AlterTable
ALTER TABLE "Expense" DROP COLUMN "coupleId",
ALTER COLUMN "groupId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Payment" DROP COLUMN "coupleId",
ALTER COLUMN "groupId" SET NOT NULL;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "coupleId";

-- DropTable
DROP TABLE "Couple";

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
