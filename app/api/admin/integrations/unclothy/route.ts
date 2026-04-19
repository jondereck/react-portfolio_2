import { NextResponse } from 'next/server';
import { canMutateContent } from '@/lib/auth/roles';
import { toAuthErrorResponse } from '@/lib/auth/responses';
import { requireAuthActor } from '@/lib/auth/session';
import { getAdminSettings } from '@/lib/server/admin-settings';
import { getUnclothyCredits, getUnclothyTaskSettings, isUnclothyConfigured } from '@/lib/server/unclothy';
import { toErrorResponse } from '@/lib/server/api-responses';

export async function GET(request: Request) {
  try {
    const actor = await requireAuthActor(request);
    if (!canMutateContent(actor.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const settings = await getAdminSettings();
    const enabled = settings.integrations.unclothyEnabled === true;
    const configured = isUnclothyConfigured();

    if (!enabled || !configured) {
      return NextResponse.json({
        enabled,
        configured,
        credits: null,
        settingsEnums: {},
        warnings: [],
      });
    }

    const warnings: string[] = [];
    let credits: number | null = null;
    let settingsEnums: Record<string, unknown> = {};

    const [creditsResult, settingsResult] = await Promise.allSettled([getUnclothyCredits(), getUnclothyTaskSettings()]);

    if (creditsResult.status === 'fulfilled') {
      credits = creditsResult.value;
    } else {
      warnings.push(
        creditsResult.reason instanceof Error
          ? `Unable to load Unclothy credits: ${creditsResult.reason.message}`
          : 'Unable to load Unclothy credits.',
      );
    }

    if (settingsResult.status === 'fulfilled') {
      settingsEnums = settingsResult.value && typeof settingsResult.value === 'object' ? settingsResult.value : {};
    } else {
      warnings.push(
        settingsResult.reason instanceof Error
          ? `Unable to load Unclothy settings enums: ${settingsResult.reason.message}`
          : 'Unable to load Unclothy settings enums.',
      );
    }

    return NextResponse.json({
      enabled,
      configured,
      credits,
      settingsEnums,
      warnings,
    });
  } catch (error) {
    const authError = toAuthErrorResponse(error);
    if (authError) {
      return authError;
    }
    return toErrorResponse(error, 'Unable to load Unclothy status.');
  }
}
