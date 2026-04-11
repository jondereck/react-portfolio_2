import { PhotoSourceType } from '@prisma/client';
import { RequestValidationError } from '@/lib/server/uploads';
import type {
  AlbumCreateInput,
  AlbumUpdateInput,
  GallerySort,
  PhotoCreateInput,
} from '@/src/modules/gallery/contracts';
import { GalleryRepository } from '@/src/modules/gallery/repositories/galleryRepository';
import { GoogleDriveAdapter } from '@/src/modules/gallery/adapters/googleDriveAdapter';

export class GalleryService {
  constructor(
    private readonly repo = new GalleryRepository(),
    private readonly driveAdapter = new GoogleDriveAdapter(),
  ) {}

  listAlbums(canViewDrafts: boolean) {
    return this.repo.listAlbums(!canViewDrafts);
  }

  async getAlbumById(id: number, canViewDrafts: boolean) {
    const album = await this.repo.getAlbumById(id);
    if (!album || (!canViewDrafts && !album.isPublished)) {
      return null;
    }

    return album;
  }

  async getAlbumBySlug(slug: string, canViewDrafts: boolean) {
    return this.repo.getAlbumBySlug(slug, !canViewDrafts);
  }

  createAlbum(input: AlbumCreateInput) {
    return this.repo.createAlbum({
      name: input.name,
      slug: input.slug,
      description: input.description,
      isPublished: input.isPublished ?? true,
    });
  }

  async updateAlbum(albumId: number, input: AlbumUpdateInput) {
    if (input.coverPhotoId !== undefined && input.coverPhotoId !== null) {
      const photos = await this.repo.getAlbumPhotosByIds(albumId, [input.coverPhotoId]);
      if (photos.length !== 1) {
        throw new RequestValidationError('Cover photo must belong to the album.', 400);
      }
    }

    return this.repo.updateAlbum(albumId, input);
  }

  deleteAlbum(albumId: number) {
    return this.repo.deleteAlbum(albumId);
  }

  async listAlbumPhotos(albumId: number, sort: GallerySort, canViewDrafts: boolean) {
    const album = await this.getAlbumById(albumId, canViewDrafts);
    if (!album) {
      return null;
    }

    const basePhotos = await this.repo.listAlbumPhotos(albumId, 'custom');
    const photos =
      sort === 'custom'
        ? basePhotos
        : [...basePhotos].sort((left, right) => {
            const leftValue = new Date(left.dateTaken ?? left.uploadedAt).getTime();
            const rightValue = new Date(right.dateTaken ?? right.uploadedAt).getTime();
            return sort === 'dateAsc' ? leftValue - rightValue : rightValue - leftValue;
          });

    return { album, photos };
  }

  addAlbumPhoto(albumId: number, input: PhotoCreateInput) {
    return this.repo.createAlbumPhoto({
      albumId,
      imageUrl: input.imageUrl,
      cloudinaryPublicId: input.cloudinaryPublicId,
      caption: input.caption,
      dateTaken: input.dateTaken ? new Date(input.dateTaken) : undefined,
      sourceType: input.sourceType as PhotoSourceType,
      sourceId: input.sourceId,
    });
  }

  async removeAlbumPhoto(albumId: number, photoId: number) {
    return this.repo.deleteAlbumPhoto(albumId, photoId);
  }

  async reorderAlbumPhotos(albumId: number, photoIds: number[]) {
    const existing = await this.repo.getAlbumPhotosByIds(albumId, photoIds);
    if (existing.length !== photoIds.length) {
      throw new RequestValidationError('Some photos are missing or belong to another album.', 400);
    }

    const uniqueIds = new Set(photoIds);
    if (uniqueIds.size !== photoIds.length) {
      throw new RequestValidationError('Duplicate photo ids are not allowed.', 400);
    }

    return this.repo.reorderAlbumPhotos(albumId, photoIds);
  }

  async importGoogleDriveFolder(albumId: number, args: { accessToken: string; folderId: string; limit: number }) {
    const drivePhotos = await this.driveAdapter.listFolderImages(args);

    const created = [];
    for (const photo of drivePhotos) {
      const dateTaken = photo.dateTaken ? new Date(photo.dateTaken) : undefined;
      const row = await this.repo.createAlbumPhoto({
        albumId,
        imageUrl: photo.imageUrl,
        caption: photo.caption,
        dateTaken: Number.isNaN(dateTaken?.getTime()) ? undefined : dateTaken,
        sourceType: PhotoSourceType.gdrive,
        sourceId: photo.sourceId,
      });
      created.push(row);
    }

    return created;
  }
}

export const galleryService = new GalleryService();
