-- CreateEnum
CREATE TYPE "UnclothyGenerationTaskStatus" AS ENUM ('queued', 'running', 'completed', 'failed', 'canceled');

-- CreateEnum
CREATE TYPE "UnclothyGenerationTaskPhase" AS ENUM ('queued', 'creating', 'processing', 'ingesting', 'done', 'error', 'canceled');

-- CreateTable
CREATE TABLE "UnclothyGenerationTask" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "profileId" INTEGER NOT NULL,
    "albumId" INTEGER NOT NULL,
    "sourcePhotoId" INTEGER NOT NULL,
    "providerTaskId" TEXT,
    "status" "UnclothyGenerationTaskStatus" NOT NULL DEFAULT 'queued',
    "phase" "UnclothyGenerationTaskPhase" NOT NULL DEFAULT 'queued',
    "percent" INTEGER NOT NULL DEFAULT 0,
    "providerStatus" TEXT,
    "statusText" TEXT,
    "errorMessage" TEXT,
    "settingsSnapshot" JSONB NOT NULL,
    "settingsSent" JSONB,
    "ingestRetries" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "canceledAt" TIMESTAMP(3),
    "createdPhotoId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UnclothyGenerationTask_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UnclothyGenerationTask_userId_status_createdAt_idx" ON "UnclothyGenerationTask"("userId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "UnclothyGenerationTask_profileId_status_createdAt_idx" ON "UnclothyGenerationTask"("profileId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "UnclothyGenerationTask_status_createdAt_idx" ON "UnclothyGenerationTask"("status", "createdAt");

-- CreateIndex
CREATE INDEX "UnclothyGenerationTask_providerTaskId_idx" ON "UnclothyGenerationTask"("providerTaskId");

-- CreateIndex
CREATE INDEX "UnclothyGenerationTask_albumId_sourcePhotoId_idx" ON "UnclothyGenerationTask"("albumId", "sourcePhotoId");

-- AddForeignKey
ALTER TABLE "UnclothyGenerationTask" ADD CONSTRAINT "UnclothyGenerationTask_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnclothyGenerationTask" ADD CONSTRAINT "UnclothyGenerationTask_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnclothyGenerationTask" ADD CONSTRAINT "UnclothyGenerationTask_albumId_fkey" FOREIGN KEY ("albumId") REFERENCES "Album"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnclothyGenerationTask" ADD CONSTRAINT "UnclothyGenerationTask_sourcePhotoId_fkey" FOREIGN KEY ("sourcePhotoId") REFERENCES "AlbumPhoto"("id") ON DELETE CASCADE ON UPDATE CASCADE;
