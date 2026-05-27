import OpenAI, { toFile } from 'openai';
import { NextResponse } from 'next/server';
import sharp from 'sharp';
import { z } from 'zod';
import { canAccessAdminModuleAction } from '@/lib/auth/module-access';
import { toAuthErrorResponse } from '@/lib/auth/responses';
import { resolveManagedProfileFromRequest } from '@/lib/profile/resolve-profile';
import { isRateLimited } from '@/lib/server/rate-limit';
import { parseMultipartOrJson } from '@/lib/server/request-parsing';
import { RequestValidationError, prepareMediaUpload } from '@/lib/server/uploads';
import { toErrorResponse } from '@/lib/server/api-responses';
import { isPhotoVideo } from '@/lib/gallery-media';
import { galleryService } from '@/src/modules/gallery/services/galleryService';

type RouteContext = { params: Promise<{ id: string; photoId: string }> };

export const maxDuration = 60;

const SNAPSHOT_ENHANCEMENT_PROMPT = `Ultra-premium professional image enhancement. Transform the uploaded low-quality, blurry image into extreme high-detail cinematic quality. Preserve 100% original identity, face structure, expression, pose, clothing, accessories, background, framing, and composition. Do NOT alter, redesign, replace, or add anything. Recover micro-details: sharp facial features natural skin texture visible pores realistic hair strands crisp eyes clean refined edges High-contrast clarity, deep depth, and balanced cinematic lighting. Poster-grade realism with dramatic but accurate detail. Output in 8K resolution, ProRes quality, studio-level sharpness. Photorealistic textures only. True-to-source enhancement only. Keep everything exactly the same only enhance quality.
remove any text`;

const snapshotEnhanceSchema = z.object({
  caption: z.string().trim().max(500).optional(),
});

const allowedSnapshotMimeTypes = new Set(['image/png', 'image/jpeg', 'image/webp']);

const parseId = (value: string) => {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
};

function isAllowedSnapshotBuffer(buffer: Buffer, mimeType: string) {
  if (mimeType === 'image/png') {
    return (
      buffer.length >= 8 &&
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47 &&
      buffer[4] === 0x0d &&
      buffer[5] === 0x0a &&
      buffer[6] === 0x1a &&
      buffer[7] === 0x0a
    );
  }

  if (mimeType === 'image/jpeg') {
    return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }

  if (mimeType === 'image/webp') {
    return (
      buffer.length >= 12 &&
      buffer[0] === 0x52 &&
      buffer[1] === 0x49 &&
      buffer[2] === 0x46 &&
      buffer[3] === 0x46 &&
      buffer[8] === 0x57 &&
      buffer[9] === 0x45 &&
      buffer[10] === 0x42 &&
      buffer[11] === 0x50
    );
  }

  return false;
}

function requireOpenAiClient() {
  if (!process.env.OPENAI_API_KEY) {
    throw new RequestValidationError(
      'Snapshot enhancement is not configured. Set OPENAI_API_KEY.',
      503,
      undefined,
      'OPENAI_NOT_CONFIGURED',
    );
  }

  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

function isOpenAiModerationBlocked(error: unknown) {
  if (!error || typeof error !== 'object') return false;
  const candidate = error as {
    code?: unknown;
    type?: unknown;
    error?: { code?: unknown; type?: unknown; message?: unknown };
  };
  return (
    candidate.code === 'moderation_blocked' ||
    candidate.error?.code === 'moderation_blocked' ||
    (typeof candidate.error?.message === 'string' && candidate.error.message.includes('safety_violations='))
  );
}

function isOpenAiUnavailable(error: unknown) {
  return error instanceof RequestValidationError && error.errorCode === 'OPENAI_NOT_CONFIGURED';
}

async function enhanceSnapshotLocally(buffer: Buffer) {
  const image = sharp(buffer, { failOn: 'none' }).rotate();
  const metadata = await image.metadata();
  const width = metadata.width || 0;
  const height = metadata.height || 0;
  const longestSide = Math.max(width, height);
  const targetLongestSide = longestSide > 0 ? Math.min(Math.max(longestSide * 2, 1600), 3072) : 2048;

  return image
    .resize({
      width: width >= height ? Math.round(targetLongestSide) : undefined,
      height: height > width ? Math.round(targetLongestSide) : undefined,
      fit: 'inside',
      kernel: sharp.kernel.lanczos3,
      withoutEnlargement: false,
    })
    .modulate({ brightness: 1.03, saturation: 1.08 })
    .linear(1.08, -5)
    .sharpen({ sigma: 1.1, m1: 1.2, m2: 0.8 })
    .png({ compressionLevel: 9, quality: 100 })
    .toBuffer();
}

export async function POST(request: Request, context: RouteContext) {
  if (await isRateLimited(request, 'gallery-snapshot-enhance', 10, 60_000)) {
    return NextResponse.json({ error: 'Too many requests. Try again later.' }, { status: 429 });
  }

  try {
    const { id: idParam, photoId: photoIdParam } = await context.params;
    const albumId = parseId(idParam);
    const photoId = parseId(photoIdParam);
    if (!albumId || !photoId) {
      return NextResponse.json({ error: 'Invalid album or photo id' }, { status: 400 });
    }

    const { data, imageFile } = await parseMultipartOrJson(request);
    if (!imageFile) {
      throw new RequestValidationError(
        'Choose a snapshot image to enhance.',
        400,
        { imageFile: ['Snapshot image is required.'] },
        'SNAPSHOT_IMAGE_REQUIRED',
      );
    }

    if (!allowedSnapshotMimeTypes.has(imageFile.type)) {
      throw new RequestValidationError(
        'Snapshot image must be a PNG, JPG, or WEBP image.',
        400,
        { imageFile: ['Unsupported file type.'] },
        'UNSUPPORTED_MEDIA_TYPE',
      );
    }

    const parsedData = snapshotEnhanceSchema.parse(data);
    const { actor, profile } = await resolveManagedProfileFromRequest(request, data);
    if (!(await canAccessAdminModuleAction(actor.user.role, 'gallery', 'createUpdate'))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const payload = await galleryService.getAlbumPhotoDownloadPayload(albumId, profile.id, photoId, true);
    if (!payload) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    if (!isPhotoVideo(payload.photo)) {
      throw new RequestValidationError(
        'Snapshot enhancement is only available for video media.',
        400,
        undefined,
        'SOURCE_MEDIA_NOT_VIDEO',
      );
    }

    const preparedSnapshot = await prepareMediaUpload(imageFile);
    if (!isAllowedSnapshotBuffer(preparedSnapshot.buffer, preparedSnapshot.mimeType)) {
      throw new RequestValidationError(
        'Uploaded snapshot content must match PNG, JPG, or WEBP.',
        400,
        { imageFile: ['Invalid image content.'] },
        'INVALID_IMAGE_CONTENT',
      );
    }

    let enhancedBuffer: Buffer | null = null;
    let enhancementProvider: 'openai' | 'local' = 'openai';
    try {
      const openai = requireOpenAiClient();
      const image = await toFile(preparedSnapshot.buffer, preparedSnapshot.originalFilename || 'video-snapshot.png', {
        type: preparedSnapshot.mimeType || 'image/png',
      });
      const response = await openai.images.edit({
        model: process.env.OPENAI_SNAPSHOT_ENHANCEMENT_MODEL || 'gpt-image-1.5',
        image,
        prompt: SNAPSHOT_ENHANCEMENT_PROMPT,
        input_fidelity: 'high',
        quality: 'high',
        size: 'auto',
        output_format: 'png',
        n: 1,
      });
      const enhancedBase64 = response.data?.[0]?.b64_json || '';
      if (!enhancedBase64) {
        throw new RequestValidationError(
          'Snapshot enhancement did not return an image.',
          502,
          undefined,
          'SNAPSHOT_ENHANCEMENT_EMPTY',
        );
      }
      enhancedBuffer = Buffer.from(enhancedBase64, 'base64');
    } catch (error) {
      console.error('[gallery snapshot enhance] OpenAI image edit failed', error);
      if (!isOpenAiModerationBlocked(error) && !isOpenAiUnavailable(error)) {
        console.warn('[gallery snapshot enhance] Falling back to local enhancement after OpenAI failure.');
      }
      enhancementProvider = 'local';
      try {
        enhancedBuffer = await enhanceSnapshotLocally(preparedSnapshot.buffer);
      } catch (localError) {
        console.error('[gallery snapshot enhance] Local enhancement failed', localError);
        throw new RequestValidationError(
          isOpenAiModerationBlocked(error)
            ? 'OpenAI blocked this snapshot and local enhancement failed. Use raw upload or choose a different video frame.'
            : 'Snapshot enhancement failed. Try again later.',
          502,
          undefined,
          'SNAPSHOT_ENHANCEMENT_FAILED',
        );
      }
    }

    const enhancedFilename = `enhanced-${preparedSnapshot.originalFilename.replace(/\.[a-z0-9]+$/i, '') || 'video-snapshot'}.png`;
    const enhancedArrayBuffer = enhancedBuffer.buffer.slice(
      enhancedBuffer.byteOffset,
      enhancedBuffer.byteOffset + enhancedBuffer.byteLength,
    ) as ArrayBuffer;
    const enhancedFile = new File([enhancedArrayBuffer], enhancedFilename, { type: 'image/png' });
    const caption = parsedData.caption || `${payload.photo.caption || payload.photo.originalFilename || `Media ${photoId}`} enhanced snapshot`;

    const created = await galleryService.addUploadedAlbumPhoto(albumId, {
      file: enhancedFile,
      input: {
        caption,
        sourceType: 'upload',
      },
    });

    return NextResponse.json({ ...created, enhancementProvider }, { status: 201 });
  } catch (error) {
    const authError = toAuthErrorResponse(error);
    if (authError) {
      return authError;
    }
    return toErrorResponse(error, 'Unable to enhance snapshot.');
  }
}
