import { NextResponse } from 'next/server';
import { isAuthorizedMutation } from '@/lib/adminAuth';
import { isRateLimited } from '@/lib/server/rate-limit';
import { uploadImageFile } from '@/lib/server/uploads';

export const runtime = 'nodejs';

const isFile = (value: FormDataEntryValue | null): value is File => {
  return typeof File !== 'undefined' && value instanceof File;
};

export async function POST(request: Request) {
  if (isRateLimited(request, 'admin-mutation', 120, 60_000)) {
    return NextResponse.json({ error: 'Too many requests. Try again later.' }, { status: 429 });
  }

  if (!isAuthorizedMutation(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const fileValue = formData.get('file');

    if (!isFile(fileValue)) {
      return NextResponse.json({ error: 'File is required' }, { status: 400 });
    }

    const secureUrl = await uploadImageFile(fileValue, 'portfolio/uploads');
    return NextResponse.json({ secure_url: secureUrl });
  } catch {
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
