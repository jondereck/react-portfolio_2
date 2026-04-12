import { PhotoSourceType, Prisma } from '@prisma/client';
import {
  prepareMediaUpload,
  RequestValidationError,
  uploadPreparedMediaFile,
} from '@/lib/server/uploads';
import type {
  AlbumCreateInput,
  AlbumUpdateInput,
  GallerySort,
  PhotoCreateInput,
} from '@/src/modules/gallery/contracts';
import {
  GalleryRepository,
  type AlbumPhotoRecord,
} from '@/src/modules/gallery/repositories/galleryRepository';
import { GoogleDriveAdapter } from '@/src/modules/gallery/adapters/googleDriveAdapter';

export class GalleryService {
  constructor(
    private readonly repo = new GalleryRepository(),
    private readonly driveAdapter = new GoogleDriveAdapter(),
  ) {}

  private createDuplicateMediaError(existing?: AlbumPhotoRecord | null) {
    return new RequestValidationError(
      'Duplicate media already exists in this album.',
      409,
      undefined,
      'DUPLICATE_MEDIA',
      existing
        ? {
            duplicate: {
              id: existing.id,
              caption: existing.caption,
              imageUrl: existing.imageUrl,
              originalFilename: existing.originalFilename,
              mimeType: existing.mimeType,
              fileSizeBytes: existing.fileSizeBytes,
            },
          }
        : undefined,
    );
  }

  private createDuplicateSourceError(existing?: AlbumPhotoRecord | null) {
    return new RequestValidationError(
      'This Google Drive media already exists in the selected album.',
      409,
      undefined,
      'DUPLICATE_SOURCE_MEDIA',
      existing
        ? {
            duplicate: {
              id: existing.id,
              caption: existing.caption,
              imageUrl: existing.imageUrl,
              sourceId: existing.sourceId,
            },
          }
        : undefined,
    );
  }

  listAlbums(canViewDrafts: boolean) {
    return this.repo.listAlbums(!canViewDrafts);
  }

  private sortPhotosByManualArrangement(photos: AlbumPhotoRecord[]) {
    return [...photos].sort((left, right) => {
      const leftOrder = Number.isFinite(left.sortOrder) ? left.sortOrder : Number.MAX_SAFE_INTEGER;
      const rightOrder = Number.isFinite(right.sortOrder) ? right.sortOrder : Number.MAX_SAFE_INTEGER;
      if (leftOrder !== rightOrder) {
        return leftOrder - rightOrder;
      }

      const leftCreatedAt = new Date(left.createdAt ?? left.uploadedAt).getTime();
      const rightCreatedAt = new Date(right.createdAt ?? right.uploadedAt).getTime();
      if (leftCreatedAt !== rightCreatedAt) {
        return leftCreatedAt - rightCreatedAt;
      }

      return left.id - right.id;
    });
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
        throw new RequestValidationError('Cover photo must belong to the album.', 400, undefined, 'INVALID_COVER_PHOTO');
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

  async getAlbumDownloadPayload(albumId: number, canViewDrafts: boolean) {
    const album = await this.getAlbumById(albumId, canViewDrafts);
    if (!album) {
      return null;
    }

    const albumWithPhotos = await this.repo.getAlbumWithPhotosForDownload(albumId);
    if (!albumWithPhotos) {
      return null;
    }

    const manuallySortedPhotos = this.sortPhotosByManualArrangement(albumWithPhotos.photos);
    const downloadablePhotos = manuallySortedPhotos.filter((photo) => photo.sourceType === PhotoSourceType.upload);
    const skippedPhotos = manuallySortedPhotos.filter((photo) => photo.sourceType !== PhotoSourceType.upload);

    return {
      album: albumWithPhotos,
      downloadablePhotos,
      skippedPhotos,
    };
  }

  async getAlbumPhotoDownloadPayload(albumId: number, photoId: number, canViewDrafts: boolean) {
    const album = await this.getAlbumById(albumId, canViewDrafts);
    if (!album) {
      return null;
    }

    const photo = await this.repo.getAlbumPhotoById(albumId, photoId);
    if (!photo) {
      return null;
    }

    return { album, photo };
  }

  async addAlbumPhoto(albumId: number, input: PhotoCreateInput) {
    if (input.contentHash) {
      const existing = await this.repo.findAlbumPhotoByContentHash(albumId, input.contentHash);
      if (existing) {
        throw this.createDuplicateMediaError(existing);
      }
    }

    if (input.sourceType === 'gdrive' && input.sourceId) {
      const existing = await this.repo.findAlbumPhotoBySourceId(albumId, PhotoSourceType.gdrive, input.sourceId);
      if (existing) {
        throw this.createDuplicateSourceError(existing);
      }
    }

    try {
      return await this.repo.createAlbumPhoto({
        albumId,
        imageUrl: input.imageUrl,
        cloudinaryPublicId: input.cloudinaryPublicId,
        contentHash: input.contentHash,
        originalFilename: input.originalFilename,
        mimeType: input.mimeType,
        fileSizeBytes: input.fileSizeBytes,
        caption: input.caption,
        dateTaken: input.dateTaken ? new Date(input.dateTaken) : undefined,
        sourceType: input.sourceType as PhotoSourceType,
        sourceId: input.sourceId,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        if (input.contentHash) {
          const existing = await this.repo.findAlbumPhotoByContentHash(albumId, input.contentHash);
          throw this.createDuplicateMediaError(existing);
        }

        if (input.sourceType === 'gdrive' && input.sourceId) {
          const existing = await this.repo.findAlbumPhotoBySourceId(albumId, PhotoSourceType.gdrive, input.sourceId);
          throw this.createDuplicateSourceError(existing);
        }
      }

      throw error;
    }
  }

  async addUploadedAlbumPhoto(albumId: number, args: { file: File; input: Omit<PhotoCreateInput, 'imageUrl'> }) {
    const prepared = await prepareMediaUpload(args.file);
    const existing = await this.repo.findAlbumPhotoByContentHash(albumId, prepared.contentHash);
    if (existing) {
      throw this.createDuplicateMediaError(existing);
    }

    const uploadedMedia = await uploadPreparedMediaFile(prepared, `portfolio/gallery/${albumId}`);

    return this.addAlbumPhoto(albumId, {
      ...args.input,
      imageUrl: uploadedMedia.playbackUrl,
      cloudinaryPublicId: uploadedMedia.publicId ?? args.input.cloudinaryPublicId,
      contentHash: prepared.contentHash,
      originalFilename: prepared.originalFilename,
      mimeType: prepared.mimeType,
      fileSizeBytes: prepared.fileSizeBytes,
      sourceType: args.input.sourceType ?? 'upload',
    });
  }

  async removeAlbumPhoto(albumId: number, photoId: number) {
    return this.repo.deleteAlbumPhoto(albumId, photoId);
  }

  async reorderAlbumPhotos(albumId: number, photoIds: number[]) {
    const existing = await this.repo.getAlbumPhotosByIds(albumId, photoIds);
    if (existing.length !== photoIds.length) {
      throw new RequestValidationError('Some photos are missing or belong to another album.', 400, undefined, 'PHOTO_NOT_FOUND');
    }

    const uniqueIds = new Set(photoIds);
    if (uniqueIds.size !== photoIds.length) {
      throw new RequestValidationError('Duplicate photo ids are not allowed.', 400, undefined, 'DUPLICATE_PHOTO_IDS');
    }

    return this.repo.reorderAlbumPhotos(albumId, photoIds);
  }

  async importGoogleDriveFolder(albumId: number, args: { accessToken: string; folderId: string; limit: number }) {
    const drivePhotos = await this.driveAdapter.listFolderImages(args);

    const created = [];
    const skipped = [];
    for (const photo of drivePhotos) {
      const existing = await this.repo.findAlbumPhotoBySourceId(albumId, PhotoSourceType.gdrive, photo.sourceId);
      if (existing) {
        skipped.push({
          sourceId: photo.sourceId,
          caption: photo.caption,
          reason: 'Already imported into this album.',
          duplicateId: existing.id,
        });
        continue;
      }

      const dateTaken = photo.dateTaken ? new Date(photo.dateTaken) : undefined;
      const row = await this.addAlbumPhoto(albumId, {
        imageUrl: photo.imageUrl,
        caption: photo.caption,
        dateTaken: dateTaken && !Number.isNaN(dateTaken.getTime()) ? dateTaken.toISOString() : undefined,
        sourceType: 'gdrive',
        sourceId: photo.sourceId,
      });
      created.push(row);
    }

    return { created, skipped };
  }
}

export const galleryService = new GalleryService();
