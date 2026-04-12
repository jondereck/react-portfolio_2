import { NextResponse } from 'next/server';
import { isAuthorizedMutation } from '@/lib/adminAuth';
import { getAdminSettings } from '@/lib/server/admin-settings';
import { isRateLimited } from '@/lib/server/rate-limit';
import { toErrorResponse } from '@/lib/server/api-responses';
import { driveImportSchema } from '@/src/modules/gallery/contracts';
import { galleryService } from '@/src/modules/gallery/services/galleryService';

type RouteContext = { params: Promise<{ id: string }> };

const parseId = (value: string) => {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
};

export async function POST(request: Request, context: RouteContext) {
  if (await isRateLimited(request, 'admin-mutation', 60, 60_000)) {
    return NextResponse.json({ error: 'Too many requests. Try again later.' }, { status: 429 });
  }

  if (!(await isAuthorizedMutation(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const settings = await getAdminSettings();
    if (!settings.integrations.googleDriveImportEnabled) {
      return NextResponse.json({ error: 'Google Drive imports are disabled.' }, { status: 403 });
    }

    const { id: idParam } = await context.params;
    const albumId = parseId(idParam);
    if (!albumId) {
      return NextResponse.json({ error: 'Invalid album id' }, { status: 400 });
    }

    const body = await request.json();
    const parsed = driveImportSchema.parse(body);
    const result = await galleryService.importGoogleDriveFolder(albumId, {
      folderId: String(parsed.folderId),
      accessToken: String(parsed.accessToken),
      limit: Number(parsed.limit ?? 50),
    });

    return NextResponse.json(
      {
        importedCount: result.created.length,
        skippedCount: result.skipped.length,
        photos: result.created,
        skipped: result.skipped,
      },
      { status: 201 },
    );
  } catch (error) {
    return toErrorResponse(error, 'Unable to import Google Drive folder.');
  }
}
