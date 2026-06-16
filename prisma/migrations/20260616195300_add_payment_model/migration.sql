-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fromUserId" TEXT NOT NULL,
    "toUserId" TEXT NOT NULL,
    "coupleId" TEXT NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Payment_coupleId_idx" ON "Payment"("coupleId");

-- CreateIndex
CREATE INDEX "Payment_fromUserId_idx" ON "Payment"("fromUserId");

-- CreateIndex
CREATE INDEX "Payment_toUserId_idx" ON "Payment"("toUserId");

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_toUserId_fkey" FOREIGN KEY ("toUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_coupleId_fkey" FOREIGN KEY ("coupleId") REFERENCES "Couple"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
