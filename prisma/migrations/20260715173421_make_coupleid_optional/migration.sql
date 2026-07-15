-- DropForeignKey
ALTER TABLE "Expense" DROP CONSTRAINT "Expense_coupleId_fkey";

-- DropForeignKey
ALTER TABLE "Payment" DROP CONSTRAINT "Payment_coupleId_fkey";

-- AlterTable
ALTER TABLE "Expense" ALTER COLUMN "coupleId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Payment" ALTER COLUMN "coupleId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_coupleId_fkey" FOREIGN KEY ("coupleId") REFERENCES "Couple"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_coupleId_fkey" FOREIGN KEY ("coupleId") REFERENCES "Couple"("id") ON DELETE SET NULL ON UPDATE CASCADE;
