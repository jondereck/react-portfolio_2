-- CreateTable
CREATE TABLE "GalleryViewerSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "albumId" INTEGER NOT NULL,
    "photoIndex" INTEGER NOT NULL DEFAULT 0,
    "viewerMode" TEXT NOT NULL DEFAULT 'focus',
    "delayMs" INTEGER NOT NULL DEFAULT 5000,
    "isPlaying" BOOLEAN NOT NULL DEFAULT false,
    "splitLeftIndex" INTEGER,
    "splitRightIndex" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GalleryViewerSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GalleryViewerSession_albumId_idx" ON "GalleryViewerSession"("albumId");

-- CreateIndex
CREATE UNIQUE INDEX "GalleryViewerSession_userId_albumId_key" ON "GalleryViewerSession"("userId", "albumId");

-- AddForeignKey
ALTER TABLE "GalleryViewerSession" ADD CONSTRAINT "GalleryViewerSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GalleryViewerSession" ADD CONSTRAINT "GalleryViewerSession_albumId_fkey" FOREIGN KEY ("albumId") REFERENCES "Album"("id") ON DELETE CASCADE ON UPDATE CASCADE;
