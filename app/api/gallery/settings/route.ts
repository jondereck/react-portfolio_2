import { NextResponse } from 'next/server';
import { getAdminSettings } from '@/lib/server/admin-settings';
import { toErrorResponse } from '@/lib/server/api-responses';

export async function GET() {
  try {
    const { integrations } = await getAdminSettings();
    return NextResponse.json({
      defaultGalleryView: integrations.defaultGalleryView === 'compact' ? 'compact' : 'cinematic',
      blurUnclothyGenerated: integrations.blurUnclothyGenerated !== false,
    });
  } catch (error) {
    return toErrorResponse(error, 'Unable to load gallery settings.');
  }
}

