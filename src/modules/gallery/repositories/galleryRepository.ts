import { PhotoSourceType, Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import type { GallerySort } from '@/src/modules/gallery/contracts';

const photoSelect = {
  id: true,
  albumId: true,
  imageUrl: true,
  cloudinaryPublicId: true,
  contentHash: true,
  originalFilename: true,
  mimeType: true,
  fileSizeBytes: true,
  caption: true,
  dateTaken: true,
  uploadedAt: true,
  sortOrder: true,
  sourceType: true,
  sourceId: true,
  createdAt: true,
  updatedAt: true,
} as const;

const albumInclude = {
  coverPhoto: { select: photoSelect },
  _count: { select: { photos: true } },
} as const;

export type AlbumRecord = Prisma.AlbumGetPayload<{ include: typeof albumInclude }>;
export type AlbumPhotoRecord = Prisma.AlbumPhotoGetPayload<{ select: typeof photoSelect }>;
export type AlbumDownloadRecord = Prisma.AlbumGetPayload<{ include: { photos: { select: typeof photoSelect } } }>;

const resolvePhotoOrderBy = (sort: GallerySort): Prisma.AlbumPhotoOrderByWithRelationInput[] => {
  if (sort === 'dateAsc') {
    return [{ dateTaken: 'asc' }, { uploadedAt: 'asc' }, { id: 'asc' }];
  }

  if (sort === 'dateDesc') {
    return [{ dateTaken: 'desc' }, { uploadedAt: 'desc' }, { id: 'desc' }];
  }

  return [{ sortOrder: 'asc' }, { id: 'asc' }];
};

export class GalleryRepository {
  async listAlbums(onlyPublished: boolean) {
    return prisma.album.findMany({
      where: onlyPublished ? { isPublished: true } : undefined,
      include: albumInclude,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });
  }

  async getAlbumById(id: number) {
    return prisma.album.findUnique({ where: { id }, include: albumInclude });
  }

  async getAlbumBySlug(slug: string, onlyPublished: boolean) {
    return prisma.album.findFirst({
      where: {
        slug,
        ...(onlyPublished ? { isPublished: true } : {}),
      },
      include: albumInclude,
    });
  }

  async getAlbumWithPhotosForDownload(id: number): Promise<AlbumDownloadRecord | null> {
    return prisma.album.findUnique({
      where: { id },
      include: {
        photos: {
          select: photoSelect,
          // Keep manual arrangement first, then use stable fallbacks for legacy/duplicate values.
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
        },
      },
    });
  }

  async createAlbum(data: { name: string; slug: string; description?: string; isPublished: boolean }) {
    return prisma.album.create({
      data: {
        name: data.name,
        slug: data.slug,
        description: data.description ?? null,
        isPublished: data.isPublished,
      },
      include: albumInclude,
    });
  }

  async updateAlbum(id: number, data: { name?: string; slug?: string; description?: string; isPublished?: boolean; coverPhotoId?: number | null }) {
    return prisma.album.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.slug !== undefined ? { slug: data.slug } : {}),
        ...(data.description !== undefined ? { description: data.description || null } : {}),
        ...(data.isPublished !== undefined ? { isPublished: data.isPublished } : {}),
        ...(data.coverPhotoId !== undefined ? { coverPhotoId: data.coverPhotoId } : {}),
      },
      include: albumInclude,
    });
  }

  async deleteAlbum(id: number) {
    await prisma.album.delete({ where: { id } });
  }

  async listAlbumPhotos(albumId: number, sort: GallerySort) {
    return prisma.albumPhoto.findMany({
      where: { albumId },
      select: photoSelect,
      orderBy: resolvePhotoOrderBy(sort),
    });
  }

  async getAlbumPhotosByIds(albumId: number, ids: number[]) {
    return prisma.albumPhoto.findMany({
      where: {
        albumId,
        id: { in: ids },
      },
      select: photoSelect,
      orderBy: [{ id: 'asc' }],
    });
  }

  async getAlbumPhotoById(albumId: number, photoId: number): Promise<AlbumPhotoRecord | null> {
    return prisma.albumPhoto.findFirst({
      where: {
        albumId,
        id: photoId,
      },
      select: photoSelect,
    });
  }

  async findAlbumPhotoByContentHash(albumId: number, contentHash: string) {
    return prisma.albumPhoto.findFirst({
      where: { albumId, contentHash },
      select: photoSelect,
    });
  }

  async findAlbumPhotoBySourceId(albumId: number, sourceType: PhotoSourceType, sourceId: string) {
    return prisma.albumPhoto.findFirst({
      where: { albumId, sourceType, sourceId },
      select: photoSelect,
    });
  }

  async createAlbumPhoto(data: {
    albumId: number;
    imageUrl: string;
    cloudinaryPublicId?: string;
    contentHash?: string;
    originalFilename?: string;
    mimeType?: string;
    fileSizeBytes?: number;
    caption?: string;
    dateTaken?: Date;
    sourceType?: PhotoSourceType;
    sourceId?: string;
  }) {
    const last = await prisma.albumPhoto.findFirst({
      where: { albumId: data.albumId },
      orderBy: [{ sortOrder: 'desc' }, { id: 'desc' }],
      select: { sortOrder: true },
    });

    return prisma.albumPhoto.create({
      data: {
        albumId: data.albumId,
        imageUrl: data.imageUrl,
        cloudinaryPublicId: data.cloudinaryPublicId ?? null,
        contentHash: data.contentHash ?? null,
        originalFilename: data.originalFilename ?? null,
        mimeType: data.mimeType ?? null,
        fileSizeBytes: data.fileSizeBytes ?? null,
        caption: data.caption ?? null,
        dateTaken: data.dateTaken,
        sourceType: data.sourceType ?? PhotoSourceType.upload,
        sourceId: data.sourceId ?? null,
        sortOrder: (last?.sortOrder ?? -1) + 1,
      },
      select: photoSelect,
    });
  }

  async deleteAlbumPhoto(albumId: number, photoId: number) {
    await prisma.albumPhoto.deleteMany({
      where: { id: photoId, albumId },
    });
  }

  async reorderAlbumPhotos(albumId: number, orderedPhotoIds: number[]) {
    await prisma.$transaction(
      orderedPhotoIds.map((photoId, index) =>
        prisma.albumPhoto.updateMany({
          where: { id: photoId, albumId },
          data: { sortOrder: index },
        }),
      ),
    );

    return this.listAlbumPhotos(albumId, 'custom');
  }
}
