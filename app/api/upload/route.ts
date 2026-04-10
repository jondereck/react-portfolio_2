import { NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import { isAuthorizedMutation } from '@/lib/adminAuth';

export const runtime = 'nodejs';

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif']);

type CloudinaryUploadResult = {
  secure_url?: string;
};

const isFile = (value: FormDataEntryValue | null): value is File => {
  return typeof File !== 'undefined' && value instanceof File;
};

export async function POST(request: Request) {
  if (!isAuthorizedMutation(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const cloudName = process.env.CLOUDINARY_NAME;
  const apiKey = process.env.CLOUDINARY_KEY;
  const apiSecret = process.env.CLOUDINARY_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    return NextResponse.json({ error: 'Upload service not configured' }, { status: 500 });
  }

  try {
    const formData = await request.formData();
    const fileValue = formData.get('file');

    if (!isFile(fileValue)) {
      return NextResponse.json({ error: 'File is required' }, { status: 400 });
    }

    if (!ALLOWED_MIME_TYPES.has(fileValue.type)) {
      return NextResponse.json({ error: 'Unsupported file type' }, { status: 400 });
    }

    if (fileValue.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File is too large' }, { status: 400 });
    }

    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
    });

    const buffer = Buffer.from(await fileValue.arrayBuffer());

    const result = await new Promise<CloudinaryUploadResult>((resolve, reject) => {
      cloudinary.uploader
        .upload_stream({}, (error, uploadResult) => {
          if (error) {
            reject(error);
            return;
          }
          resolve(uploadResult ?? {});
        })
        .end(buffer);
    });

    if (!result.secure_url) {
      return NextResponse.json({ error: 'Upload failed' }, { status: 502 });
    }

    return NextResponse.json({ secure_url: result.secure_url });
  } catch {
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
