import { NextResponse } from 'next/server';
import { canMutateContent } from '@/lib/auth/roles';
import { toAuthErrorResponse } from '@/lib/auth/responses';
import { isRateLimited } from '@/lib/server/rate-limit';
import { RequestValidationError } from '@/lib/server/uploads';
import { toErrorResponse } from '@/lib/server/api-responses';
import { resolveManagedProfileFromRequest } from '@/lib/profile/resolve-profile';
import { getAdminSettings, updateAdminSettings } from '@/lib/server/admin-settings';
import { galleryService } from '@/src/modules/gallery/services/galleryService';

function parseAlbumId(value: unknown) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function makeDefaultsKey(profileId: number, albumId: number) {
  return `${profileId}:${albumId}`;
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const albumId = parseAlbumId(url.searchParams.get('albumId'));
    if (!albumId) {
      throw new RequestValidationError('Invalid album id.', 400, { albumId: ['Invalid album id.'] }, 'INVALID_ALBUM_ID');
    }

    const { actor, profile } = await resolveManagedProfileFromRequest(request);
    if (!canMutateContent(actor.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const album = await galleryService.getAlbumById(albumId, profile.id, true);
    if (!album) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const settings = await getAdminSettings();
    const defaults = (settings.integrations as any)?.unclothyAlbumDefaults;
    const key = makeDefaultsKey(profile.id, albumId);
    const entry = defaults && typeof defaults === 'object' ? (defaults as Record<string, any>)[key] : null;

    return NextResponse.json({
      albumId,
      settings: entry?.settings && typeof entry.settings === 'object' ? entry.settings : null,
      updatedAt: typeof entry?.updatedAt === 'number' ? entry.updatedAt : null,
    });
  } catch (error) {
    const authError = toAuthErrorResponse(error);
    if (authError) {
      return authError;
    }
    return toErrorResponse(error, 'Unable to load Unclothy album defaults.');
  }
}

export async function PUT(request: Request) {
  if (await isRateLimited(request, 'admin-mutation', 120, 60_000)) {
    return NextResponse.json({ error: 'Too many requests. Try again later.' }, { status: 429 });
  }

  try {
    const body = (await request.json().catch(() => null)) as any;
    const albumId = parseAlbumId(body?.albumId);
    if (!albumId) {
      throw new RequestValidationError('Invalid album id.', 400, { albumId: ['Invalid album id.'] }, 'INVALID_ALBUM_ID');
    }

    const incomingSettings = body?.settings && typeof body.settings === 'object' ? body.settings : null;
    if (!incomingSettings) {
      throw new RequestValidationError(
        'Settings payload is required.',
        400,
        { settings: ['Settings payload is required.'] },
        'MISSING_SETTINGS',
      );
    }

    const { actor, profile } = await resolveManagedProfileFromRequest(request, body);
    if (!canMutateContent(actor.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const album = await galleryService.getAlbumById(albumId, profile.id, true);
    if (!album) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const current = await getAdminSettings({ fresh: true });
    const currentDefaults = (current.integrations as any)?.unclothyAlbumDefaults;
    const nextDefaults =
      currentDefaults && typeof currentDefaults === 'object' && !Array.isArray(currentDefaults) ? { ...currentDefaults } : {};

    const key = makeDefaultsKey(profile.id, albumId);
    nextDefaults[key] = {
      settings: incomingSettings,
      updatedAt: Date.now(),
    };

    await updateAdminSettings({
      integrations: {
        unclothyAlbumDefaults: nextDefaults,
      } as any,
    });

    return NextResponse.json({
      albumId,
      settings: incomingSettings,
      updatedAt: nextDefaults[key].updatedAt,
    });
  } catch (error) {
    const authError = toAuthErrorResponse(error);
    if (authError) {
      return authError;
    }
    return toErrorResponse(error, 'Unable to save Unclothy album defaults.');
  }
}

