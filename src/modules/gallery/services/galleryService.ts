import { PhotoSourceType, Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { prisma } from '@/lib/prisma';
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
  photoSelect as albumPhotoSelect,
  type AlbumPhotoRecord,
} from '@/src/modules/gallery/repositories/galleryRepository';
import { GoogleDriveAdapter } from '@/src/modules/gallery/adapters/googleDriveAdapter';

type MoveAlbumPhotoResultEntry = {
  photoId: number;
  fileName: string;
  status: 'moved' | 'duplicate-skipped' | 'error';
  reason: string;
  errorCode?: string;
  duplicate?: {
    id: number;
    caption: string | null;
    imageUrl: string | null;
  } | null;
};

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

  listAlbums(profileId: number, canViewDrafts: boolean) {
    return this.repo.listAlbums(profileId, !canViewDrafts);
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

  async getAlbumById(id: number, profileId: number, canViewDrafts: boolean) {
    const album = await this.repo.getAlbumById(id, profileId);
    if (!album || (!canViewDrafts && !album.isPublished)) {
      return null;
    }

    return album;
  }

  async getAlbumBySlug(slug: string, profileId: number, canViewDrafts: boolean) {
    return this.repo.getAlbumBySlug(slug, profileId, !canViewDrafts);
  }

  createAlbum(profileId: number, input: AlbumCreateInput) {
    const shareLinkEnabled = input.shareLinkEnabled ?? false;
    return this.repo.createAlbum({
      profileId,
      name: input.name,
      slug: input.slug,
      description: input.description,
      isPublished: input.isPublished ?? true,
      shareLinkEnabled,
      shareToken: shareLinkEnabled ? randomUUID().replace(/-/g, '') : null,
    });
  }

  async updateAlbum(albumId: number, input: AlbumUpdateInput) {
    const currentAlbum = await prisma.album.findUnique({
      where: { id: albumId },
      select: { shareToken: true },
    });

    if (input.coverPhotoId !== undefined && input.coverPhotoId !== null) {
      const photos = await this.repo.getAlbumPhotosByIds(albumId, [input.coverPhotoId]);
      if (photos.length !== 1) {
        throw new RequestValidationError('Cover photo must belong to the album.', 400, undefined, 'INVALID_COVER_PHOTO');
      }
    }

    let shareToken: string | null | undefined;
    if (input.shareLinkEnabled !== undefined) {
      if (input.shareLinkEnabled) {
        shareToken = currentAlbum?.shareToken ?? randomUUID().replace(/-/g, '');
      } else {
        shareToken = null;
      }
    }

    return this.repo.updateAlbum(albumId, {
      ...input,
      ...(shareToken !== undefined ? { shareToken } : {}),
    });
  }

  async getAlbumByShareToken(shareToken: string) {
    return this.repo.getAlbumByShareToken(shareToken);
  }

  deleteAlbum(albumId: number) {
    return this.repo.deleteAlbum(albumId);
  }

  async listAlbumPhotos(albumId: number, profileId: number, sort: GallerySort, canViewDrafts: boolean) {
    const album = await this.getAlbumById(albumId, profileId, canViewDrafts);
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

  async getAlbumDownloadPayload(albumId: number, profileId: number, canViewDrafts: boolean) {
    const album = await this.getAlbumById(albumId, profileId, canViewDrafts);
    if (!album) {
      return null;
    }

    const albumWithPhotos = await this.repo.getAlbumWithPhotosForDownload(albumId, profileId);
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

  async getAlbumPhotoDownloadPayload(albumId: number, profileId: number, photoId: number, canViewDrafts: boolean) {
    const album = await this.getAlbumById(albumId, profileId, canViewDrafts);
    if (!album) {
      return null;
    }

    const photo = await this.repo.getAlbumPhotoById(albumId, photoId);
    if (!photo) {
      return null;
    }

    return { album, photo };
  }

  async addAlbumPhoto(
    albumId: number,
    input: PhotoCreateInput,
    options: { skipContentHashDuplicateCheck?: boolean } = {},
  ) {
    if (input.contentHash && !options.skipContentHashDuplicateCheck) {
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

    return this.addAlbumPhoto(
      albumId,
      {
        ...args.input,
        imageUrl: uploadedMedia.playbackUrl,
        cloudinaryPublicId: uploadedMedia.publicId ?? args.input.cloudinaryPublicId,
        contentHash: prepared.contentHash,
        originalFilename: prepared.originalFilename,
        mimeType: prepared.mimeType,
        fileSizeBytes: prepared.fileSizeBytes,
        sourceType: args.input.sourceType ?? 'upload',
      },
      { skipContentHashDuplicateCheck: true },
    );
  }

  async moveAlbumPhotos(sourceAlbumId: number, targetAlbumId: number, photoIds: number[]) {
    if (sourceAlbumId === targetAlbumId) {
      throw new RequestValidationError(
        'Source and destination albums must be different.',
        400,
        undefined,
        'INVALID_MOVE_TARGET',
      );
    }

    if (photoIds.length === 0) {
      throw new RequestValidationError('Select at least one media item first.', 400, undefined, 'EMPTY_MOVE_SELECTION');
    }

    const sourcePhotos = await this.repo.getAlbumPhotosByIds(sourceAlbumId, photoIds);
    if (sourcePhotos.length !== photoIds.length) {
      throw new RequestValidationError(
        'Some photos are missing or belong to another album.',
        400,
        undefined,
        'PHOTO_NOT_FOUND',
      );
    }

    const sourcePhotoById = new Map(sourcePhotos.map((photo) => [photo.id, photo]));
    const orderedSourcePhotos = photoIds
      .map((photoId) => sourcePhotoById.get(photoId))
      .filter((photo): photo is AlbumPhotoRecord => Boolean(photo));

    const results: MoveAlbumPhotoResultEntry[] = [];
    let movedCount = 0;
    let skippedCount = 0;
    let failedCount = 0;

    for (const photo of orderedSourcePhotos) {
      try {
        const result = await prisma.$transaction(async (tx) => {
          const duplicate =
            photo.sourceType === PhotoSourceType.gdrive && photo.sourceId
              ? await tx.albumPhoto.findFirst({
                  where: {
                    albumId: targetAlbumId,
                    sourceType: PhotoSourceType.gdrive,
                    sourceId: photo.sourceId,
                  },
                  select: albumPhotoSelect,
                })
              : photo.contentHash
                ? await tx.albumPhoto.findFirst({
                    where: { albumId: targetAlbumId, contentHash: photo.contentHash },
                    select: albumPhotoSelect,
                  })
                : null;

          if (duplicate) {
            return {
              status: 'duplicate-skipped' as const,
              duplicate: {
                id: duplicate.id,
                caption: duplicate.caption,
                imageUrl: duplicate.imageUrl,
              },
            };
          }

          const last = await tx.albumPhoto.findFirst({
            where: { albumId: targetAlbumId },
            orderBy: [{ sortOrder: 'desc' }, { id: 'desc' }],
            select: { sortOrder: true },
          });

          const created = await tx.albumPhoto.create({
            data: {
              albumId: targetAlbumId,
              imageUrl: photo.imageUrl,
              cloudinaryPublicId: photo.cloudinaryPublicId,
              contentHash: photo.contentHash,
              originalFilename: photo.originalFilename,
              mimeType: photo.mimeType,
              fileSizeBytes: photo.fileSizeBytes,
              caption: photo.caption,
              dateTaken: photo.dateTaken,
              sourceType: photo.sourceType,
              sourceId: photo.sourceId,
              sortOrder: (last?.sortOrder ?? -1) + 1,
            },
            select: albumPhotoSelect,
          });

          await tx.albumPhoto.delete({
            where: { id: photo.id },
          });

          return {
            status: 'moved' as const,
            created,
          };
        });

        if (result.status === 'moved') {
          movedCount += 1;
          results.push({
            photoId: photo.id,
            fileName: photo.originalFilename || photo.caption || `Media ${photo.id}`,
            status: 'moved',
            reason: 'Moved successfully.',
          });
          continue;
        }

        skippedCount += 1;
        results.push({
          photoId: photo.id,
          fileName: photo.originalFilename || photo.caption || `Media ${photo.id}`,
          status: 'duplicate-skipped',
          reason: 'Duplicate already exists in the target album.',
          duplicate: result.duplicate,
        });
      } catch (error) {
        failedCount += 1;
        results.push({
          photoId: photo.id,
          fileName: photo.originalFilename || photo.caption || `Media ${photo.id}`,
          status: 'error',
          reason: error instanceof Error && error.message ? error.message : 'Move failed.',
          errorCode: error instanceof RequestValidationError ? error.errorCode : undefined,
        });
      }
    }

    return {
      sourceAlbumId,
      targetAlbumId,
      totalFiles: orderedSourcePhotos.length,
      movedCount,
      skippedCount,
      failedCount,
      results,
    };
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
