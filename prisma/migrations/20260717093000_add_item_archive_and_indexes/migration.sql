-- AlterTable
ALTER TABLE "Item" ADD COLUMN     "isArchived" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "Item_wishlistId_idx" ON "Item"("wishlistId");

-- CreateIndex
CREATE INDEX "Item_categoryId_idx" ON "Item"("categoryId");
