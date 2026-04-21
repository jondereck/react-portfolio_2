-- Add retry/backoff metadata for Unclothy queue processing

ALTER TABLE "UnclothyGenerationTask"
  ADD COLUMN "attempts" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "nextRunAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "lastErrorCode" TEXT,
  ADD COLUMN "lastErrorAt" TIMESTAMP(3);

CREATE INDEX "UnclothyGenerationTask_status_nextRunAt_idx"
  ON "UnclothyGenerationTask"("status", "nextRunAt");

