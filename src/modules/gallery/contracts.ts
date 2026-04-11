import { z } from 'zod';

export const gallerySortSchema = z.enum(['custom', 'dateAsc', 'dateDesc']).default('custom');

export const albumCreateSchema = z.object({
  name: z.string().trim().min(1).max(120),
  slug: z
    .string()
    .trim()
    .min(1)
    .max(160)
    .regex(/^[a-z0-9-]+$/),
  description: z.string().trim().max(1000).optional(),
  isPublished: z.boolean().optional().default(true),
});

export const albumUpdateSchema = albumCreateSchema.partial().extend({
  coverPhotoId: z.number().int().positive().nullable().optional(),
});

export const photoCreateSchema = z.object({
  imageUrl: z.string().trim().url().max(700),
  caption: z.string().trim().max(500).optional(),
  dateTaken: z.string().datetime().optional(),
  cloudinaryPublicId: z.string().trim().max(300).optional(),
  sourceType: z.enum(['upload', 'gdrive']).optional().default('upload'),
  sourceId: z.string().trim().max(300).optional(),
});

export const reorderPhotosSchema = z.object({
  photoIds: z.array(z.number().int().positive()).min(1),
});

export const driveImportSchema = z.object({
  folderId: z.string().trim().min(1),
  accessToken: z.string().trim().min(1),
  limit: z.number().int().min(1).max(200).optional().default(50),
});

export type GallerySort = z.infer<typeof gallerySortSchema>;
export type AlbumCreateInput = z.infer<typeof albumCreateSchema>;
export type AlbumUpdateInput = z.infer<typeof albumUpdateSchema>;
export type PhotoCreateInput = z.infer<typeof photoCreateSchema>;
export type ReorderPhotosInput = z.infer<typeof reorderPhotosSchema>;
export type DriveImportInput = z.infer<typeof driveImportSchema>;
