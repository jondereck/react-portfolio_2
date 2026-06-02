import { NextResponse } from 'next/server';
import { canAccessAdminModuleAction } from '@/lib/auth/module-access';
import { requireAuthActor } from '@/lib/auth/session';
import { isSuperAdmin } from '@/lib/auth/roles';
import { getAdminSettings } from '@/lib/server/admin-settings';
import {
  createUnclothySuccessResponse,
  getUnclothyCredits,
  getUnclothyTaskSettings,
  isUnclothyConfigured,
  toUnclothyErrorResponse,
} from '@/lib/server/unclothy';
import { getUnclothyUsageSummaryForUser, normalizeUnclothyGlobalConcurrentLimit } from '@/lib/server/unclothy-limits';

export async function GET(request: Request) {
  try {
    const actor = await requireAuthActor(request);
    if (!(await canAccessAdminModuleAction(actor.user.role, 'gallery', 'createUpdate'))) {
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
    const canViewProviderCredits = isSuperAdmin(actor.user.role);
    const quota = {
      ...(await getUnclothyUsageSummaryForUser(actor.user)),
      globalConcurrentGenerationLimit: normalizeUnclothyGlobalConcurrentLimit(settings.integrations.unclothyGlobalConcurrentGenerationLimit),
    };

    if (!enabled || !configured) {
      return createUnclothySuccessResponse({
        enabled,
        configured,
        credits: null,
        canViewProviderCredits,
        quota,
        settingsEnums: {},
        warnings: [],
      });
    }

    const warnings: string[] = [];
    let credits: number | null = null;
    let settingsEnums: Record<string, unknown> = {};

    const [creditsResult, settingsResult] = await Promise.allSettled([
      canViewProviderCredits ? getUnclothyCredits() : Promise.resolve(null),
      getUnclothyTaskSettings(),
    ]);

    if (canViewProviderCredits) {
      if (creditsResult.status === 'fulfilled') {
        credits = creditsResult.value;
      } else {
        warnings.push(
          creditsResult.reason instanceof Error
            ? `Unable to load Unclothy credits: ${creditsResult.reason.message}`
            : 'Unable to load Unclothy credits.',
        );
      }
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
      canViewProviderCredits,
      quota,
      settingsEnums,
      warnings,
    });
  } catch (error) {
    return toUnclothyErrorResponse(error, 'Unable to load Unclothy status.');
  }
}
