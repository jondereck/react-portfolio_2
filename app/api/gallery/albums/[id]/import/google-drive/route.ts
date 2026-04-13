import { NextResponse } from 'next/server';
import { canMutateContent } from '@/lib/auth/roles';
import { toAuthErrorResponse } from '@/lib/auth/responses';
import { getAdminSettings } from '@/lib/server/admin-settings';
import { isRateLimited } from '@/lib/server/rate-limit';
import { toErrorResponse } from '@/lib/server/api-responses';
import { resolveManagedProfileFromRequest } from '@/lib/profile/resolve-profile';
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

  try {
    const body = await request.json();
    const { actor, profile } = await resolveManagedProfileFromRequest(request, body);
    if (!canMutateContent(actor.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const settings = await getAdminSettings();
    if (!settings.integrations.googleDriveImportEnabled) {
      return NextResponse.json({ error: 'Google Drive imports are disabled.' }, { status: 403 });
    }

    const { id: idParam } = await context.params;
    const albumId = parseId(idParam);
    if (!albumId) {
      return NextResponse.json({ error: 'Invalid album id' }, { status: 400 });
    }

    const album = await galleryService.getAlbumById(albumId, profile.id, true);
    if (!album) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
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
    const authError = toAuthErrorResponse(error);
    if (authError) {
      return authError;
    }
    return toErrorResponse(error, 'Unable to import Google Drive folder.');
  }
}
