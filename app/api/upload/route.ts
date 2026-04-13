import { NextResponse } from 'next/server';
import { canMutateContent } from '@/lib/auth/roles';
import { toAuthErrorResponse } from '@/lib/auth/responses';
import { resolveManagedProfileFromRequest } from '@/lib/profile/resolve-profile';
import { getCloudinaryFolderPath } from '@/lib/server/admin-settings';
import { isRateLimited } from '@/lib/server/rate-limit';
import { uploadImageFile } from '@/lib/server/uploads';

export const runtime = 'nodejs';

const isFile = (value: FormDataEntryValue | null): value is File => {
  return typeof File !== 'undefined' && value instanceof File;
};

export async function POST(request: Request) {
  if (await isRateLimited(request, 'admin-mutation', 120, 60_000)) {
    return NextResponse.json({ error: 'Too many requests. Try again later.' }, { status: 429 });
  }

  try {
    const { actor } = await resolveManagedProfileFromRequest(request);
    if (!canMutateContent(actor.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const formData = await request.formData();
    const fileValue = formData.get('file');

    if (!isFile(fileValue)) {
      return NextResponse.json({ error: 'File is required' }, { status: 400 });
    }

    const secureUrl = await uploadImageFile(fileValue, await getCloudinaryFolderPath('uploads'));
    return NextResponse.json({ secure_url: secureUrl });
  } catch (error) {
    const authError = toAuthErrorResponse(error);
    if (authError) {
      return authError;
    }
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
