import { NextResponse } from 'next/server';
import { canMutateContent } from '@/lib/auth/roles';
import { requireAuthActor } from '@/lib/auth/session';
import { getAdminSettings } from '@/lib/server/admin-settings';
import {
  createUnclothySuccessResponse,
  getUnclothyCredits,
  getUnclothyTaskSettings,
  isUnclothyConfigured,
  toUnclothyErrorResponse,
} from '@/lib/server/unclothy';

export async function GET(request: Request) {
  try {
    const actor = await requireAuthActor(request);
    if (!canMutateContent(actor.user.role)) {
      return NextResponse.json(
        {
          success: false,
          status_code: 403,
          status_text: 'Forbidden',
          message: 'Forbidden',
        },
        { status: 403 },
      );
    }

    const settings = await getAdminSettings();
    const enabled = settings.integrations.unclothyEnabled === true;
    const configured = isUnclothyConfigured();

    if (!enabled || !configured) {
      return createUnclothySuccessResponse({
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

    return createUnclothySuccessResponse({
      enabled,
      configured,
      credits,
      settingsEnums,
      warnings,
    });
  } catch (error) {
    return toUnclothyErrorResponse(error, 'Unable to load Unclothy status.');
  }
}
