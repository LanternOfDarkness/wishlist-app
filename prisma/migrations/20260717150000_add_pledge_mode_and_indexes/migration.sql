-- AlterTable
ALTER TABLE "Pledge" ADD COLUMN     "mode" TEXT NOT NULL DEFAULT 'full';

-- CreateIndex
CREATE INDEX "Pledge_itemId_idx" ON "Pledge"("itemId");

-- CreateIndex
CREATE INDEX "Pledge_userId_idx" ON "Pledge"("userId");

-- CreateIndex
-- Partial unique index: at most one "full" reservation pledge per item. Not
-- representable in schema.prisma (no WHERE clause support in @@unique), so
-- it only exists here. This is a defense-in-depth backstop — the primary
-- race guard is the atomic `Item.isReserved` compare-and-swap in
-- src/lib/reservation.ts.
CREATE UNIQUE INDEX "Pledge_one_full_reservation_per_item" ON "Pledge"("itemId") WHERE "mode" = 'full';
