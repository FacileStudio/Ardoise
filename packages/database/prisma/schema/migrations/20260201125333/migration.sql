/*
  Warnings:

  - A unique constraint covering the columns `[key]` on the table `Media` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Media_key_key" ON "Media"("key");
