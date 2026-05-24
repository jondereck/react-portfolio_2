ALTER TABLE "User"
  ADD COLUMN "unclothyMonthlyGenerationLimit" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "unclothyConcurrentGenerationLimit" INTEGER NOT NULL DEFAULT 1;

ALTER TABLE "UnclothyGenerationTask"
  ADD COLUMN "quotaPeriod" TEXT;

CREATE INDEX "UnclothyGenerationTask_userId_quotaPeriod_status_idx"
  ON "UnclothyGenerationTask"("userId", "quotaPeriod", "status");
