-- Persist NSFW moderation + per-media blur overrides.
ALTER TABLE "AlbumPhoto" ADD COLUMN "nsfwDetected" BOOLEAN;
ALTER TABLE "AlbumPhoto" ADD COLUMN "nsfwDetectedAt" TIMESTAMP(3);
ALTER TABLE "AlbumPhoto" ADD COLUMN "nsfwScores" JSONB;
ALTER TABLE "AlbumPhoto" ADD COLUMN "blurOverride" TEXT NOT NULL DEFAULT 'auto';

