ALTER TABLE "AlbumPhoto"
ADD COLUMN "contentHash" TEXT,
ADD COLUMN "originalFilename" TEXT,
ADD COLUMN "mimeType" TEXT,
ADD COLUMN "fileSizeBytes" INTEGER;

CREATE INDEX "AlbumPhoto_albumId_sourceType_sourceId_idx" ON "AlbumPhoto"("albumId", "sourceType", "sourceId");

CREATE UNIQUE INDEX "AlbumPhoto_albumId_contentHash_key" ON "AlbumPhoto"("albumId", "contentHash");
