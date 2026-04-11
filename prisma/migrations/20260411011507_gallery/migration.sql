/*
  Warnings:

  - Made the column `tech` on table `Portfolio` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Portfolio" ALTER COLUMN "tech" SET NOT NULL;

-- CreateTable
CREATE TABLE "SiteConfig" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "logoText" TEXT,
    "logoImage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteConfig_pkey" PRIMARY KEY ("id")
);
