import { PhotoSourceType, Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import type { GallerySort } from '@/src/modules/gallery/contracts';

const photoSelect = {
  id: true,
  albumId: true,
  imageUrl: true,
  cloudinaryPublicId: true,
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

  async createAlbumPhoto(data: {
    albumId: number;
    imageUrl: string;
    cloudinaryPublicId?: string;
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
