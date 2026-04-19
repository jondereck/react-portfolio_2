-- Add per-album profile/social links.
ALTER TABLE "Album" ADD COLUMN "profileLinks" JSONB;
