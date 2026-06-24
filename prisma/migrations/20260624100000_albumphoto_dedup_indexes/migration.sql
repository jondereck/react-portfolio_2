-- Support profile-wide duplicate detection (lookups by contentHash and by
-- (sourceType, sourceId) without albumId) so they remain index seeks instead of
-- full table scans as the gallery grows.
CREATE INDEX "AlbumPhoto_contentHash_idx" ON "AlbumPhoto"("contentHash");

CREATE INDEX "AlbumPhoto_sourceType_sourceId_idx" ON "AlbumPhoto"("sourceType", "sourceId");
