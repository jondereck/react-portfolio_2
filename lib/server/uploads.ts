import { v2 as cloudinary } from 'cloudinary';

export const MAX_IMAGE_FILE_SIZE = 5 * 1024 * 1024;
export const ALLOWED_IMAGE_MIME_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif']);

export class RequestValidationError extends Error {
  status: number;
  details?: Record<string, string[]>;

  constructor(message: string, status = 400, details?: Record<string, string[]>) {
    super(message);
    this.name = 'RequestValidationError';
    this.status = status;
    this.details = details;
  }
}

export const isFile = (value: FormDataEntryValue | null | undefined): value is File => {
  return typeof File !== 'undefined' && value instanceof File;
};

export function validateImageFile(file: File, fieldName = 'imageFile') {
  if (!ALLOWED_IMAGE_MIME_TYPES.has(file.type)) {
    throw new RequestValidationError(
      `${fieldName} must be a PNG, JPG, WEBP, or GIF image.`,
      400,
      { [fieldName]: ['Unsupported file type.'] },
    );
  }

  if (file.size > MAX_IMAGE_FILE_SIZE) {
    throw new RequestValidationError(
      `${fieldName} must be 5MB or smaller.`,
      400,
      { [fieldName]: ['File is too large.'] },
    );
  }
}

function isSupportedImageBuffer(buffer: Buffer): boolean {
  // PNG
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return true;
  }

  // JPEG
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return true;
  }

  // GIF87a / GIF89a
  if (
    buffer.length >= 6 &&
    buffer[0] === 0x47 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x38 &&
    (buffer[4] === 0x37 || buffer[4] === 0x39) &&
    buffer[5] === 0x61
  ) {
    return true;
  }

  // WEBP (RIFF....WEBP)
  if (
    buffer.length >= 12 &&
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return true;
  }

  return false;
}

export async function uploadImageFile(file: File, folder: string) {
  validateImageFile(file);

  const cloudName = process.env.CLOUDINARY_NAME;
  const apiKey = process.env.CLOUDINARY_KEY;
  const apiSecret = process.env.CLOUDINARY_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    throw new RequestValidationError('Upload service not configured.', 500);
  }

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
  });

  const buffer = Buffer.from(await file.arrayBuffer());
  if (!isSupportedImageBuffer(buffer)) {
    throw new RequestValidationError('Uploaded content does not match a supported image format.', 400, {
      imageFile: ['Invalid image content.'],
    });
  }
  const result = await new Promise<{ secure_url?: string }>((resolve, reject) => {
    cloudinary.uploader
      .upload_stream({ folder }, (error, uploadResult) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(uploadResult ?? {});
      })
      .end(buffer);
  });

  if (!result.secure_url) {
    throw new RequestValidationError('Image upload failed.', 502);
  }

  return result.secure_url;
}
