-- AlterTable
ALTER TABLE "Group" ADD COLUMN     "archivedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "GroupMember" ADD COLUMN     "splitPercentage" DECIMAL(5,2);
