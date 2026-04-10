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
