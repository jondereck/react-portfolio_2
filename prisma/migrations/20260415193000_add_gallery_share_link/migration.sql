-- Add share-link support for gallery albums.
ALTER TABLE "Album" ADD COLUMN "shareLinkEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Album" ADD COLUMN "shareToken" TEXT;
CREATE UNIQUE INDEX "Album_shareToken_key" ON "Album"("shareToken");
