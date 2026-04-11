-- CreateEnum
CREATE TYPE "PhotoSourceType" AS ENUM ('upload', 'gdrive');

-- CreateTable
CREATE TABLE "Album" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "coverPhotoId" INTEGER,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Album_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AlbumPhoto" (
    "id" SERIAL NOT NULL,
    "albumId" INTEGER NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "cloudinaryPublicId" TEXT,
    "caption" TEXT,
    "dateTaken" TIMESTAMP(3),
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "sourceType" "PhotoSourceType" NOT NULL DEFAULT 'upload',
    "sourceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AlbumPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Album_slug_key" ON "Album"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Album_coverPhotoId_key" ON "Album"("coverPhotoId");

-- CreateIndex
CREATE INDEX "Album_isPublished_createdAt_idx" ON "Album"("isPublished", "createdAt");

-- CreateIndex
CREATE INDEX "AlbumPhoto_albumId_sortOrder_idx" ON "AlbumPhoto"("albumId", "sortOrder");

-- CreateIndex
CREATE INDEX "AlbumPhoto_albumId_dateTaken_idx" ON "AlbumPhoto"("albumId", "dateTaken");

-- CreateIndex
CREATE INDEX "AlbumPhoto_albumId_uploadedAt_idx" ON "AlbumPhoto"("albumId", "uploadedAt");

-- AddForeignKey
ALTER TABLE "AlbumPhoto" ADD CONSTRAINT "AlbumPhoto_albumId_fkey" FOREIGN KEY ("albumId") REFERENCES "Album"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Album" ADD CONSTRAINT "Album_coverPhotoId_fkey" FOREIGN KEY ("coverPhotoId") REFERENCES "AlbumPhoto"("id") ON DELETE SET NULL ON UPDATE CASCADE;
