import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { writeAuditEvent } from '@/lib/audit/audit';
import { defaultAdminIntegrations, defaultAdminSecurity, defaultAdminSettings } from '@/lib/adminSettingsDefaults';
import { integrationsSettingsSchema, securitySettingsSchema } from '@/lib/validators';

type AdminSettingsSnapshot = {
  integrations: typeof defaultAdminIntegrations;
  security: typeof defaultAdminSecurity;
};

type IntegrationStatus = {
  key: 'database' | 'cloudinary' | 'resend' | 'googleDrive' | 'unclothy';
  label: string;
  configured: boolean;
  state: 'connected' | 'warning' | 'disabled';
  description: string;
};

type AdminAuditEventPayload = {
  actorUserId?: string | null;
  targetProfileId?: number | null;
  type: string;
  targetType?: string | null;
  targetId?: string | null;
  details?: Record<string, unknown>;
};

const ADMIN_SETTINGS_ID = 1;
const CACHE_TTL_MS = 5_000;

let cachedSettings: { value: AdminSettingsSnapshot; expiresAt: number } | null = null;

const normalizeIntegrations = (value: unknown) => {
  const parsed = integrationsSettingsSchema.partial().safeParse(value);
  return {
    ...defaultAdminIntegrations,
    ...(parsed.success ? parsed.data : {}),
  };
};

const normalizeSecurity = (value: unknown) => {
  const parsed = securitySettingsSchema.partial().safeParse(value);
  return {
    ...defaultAdminSecurity,
    ...(parsed.success ? parsed.data : {}),
  };
};

const toSnapshot = (record: { integrations: Prisma.JsonValue; security: Prisma.JsonValue }): AdminSettingsSnapshot => ({
  integrations: normalizeIntegrations(record.integrations),
  security: normalizeSecurity(record.security),
});

export function clearAdminSettingsCache() {
  cachedSettings = null;
}

export async function ensureAdminSettings() {
  await prisma.adminSettings.upsert({
    where: { id: ADMIN_SETTINGS_ID },
    update: {},
    create: {
      id: ADMIN_SETTINGS_ID,
      integrations: defaultAdminSettings.integrations,
      security: defaultAdminSettings.security,
    },
  });
}

export async function getAdminSettings(options?: { fresh?: boolean }): Promise<AdminSettingsSnapshot> {
  const now = Date.now();
  if (!options?.fresh && cachedSettings && cachedSettings.expiresAt > now) {
    return cachedSettings.value;
  }

  await ensureAdminSettings();
  const record = await prisma.adminSettings.findUnique({ where: { id: ADMIN_SETTINGS_ID } });
  const value = record
    ? toSnapshot({ integrations: record.integrations, security: record.security })
    : {
        integrations: { ...defaultAdminSettings.integrations },
        security: { ...defaultAdminSettings.security },
      };

  cachedSettings = {
    value,
    expiresAt: now + CACHE_TTL_MS,
  };

  return value;
}

export async function updateAdminSettings(input: {
  integrations?: Partial<typeof defaultAdminIntegrations>;
  security?: Partial<typeof defaultAdminSecurity>;
}) {
  const current = await getAdminSettings({ fresh: true });
  const nextIntegrations = {
    ...current.integrations,
    ...(input.integrations ?? {}),
  };
  const nextSecurity = {
    ...current.security,
    ...(input.security ?? {}),
  };

  const record = await prisma.adminSettings.upsert({
    where: { id: ADMIN_SETTINGS_ID },
    update: {
      integrations: nextIntegrations as Prisma.InputJsonObject,
      security: nextSecurity as Prisma.InputJsonObject,
    },
    create: {
      id: ADMIN_SETTINGS_ID,
      integrations: nextIntegrations as Prisma.InputJsonObject,
      security: nextSecurity as Prisma.InputJsonObject,
    },
  });

  clearAdminSettingsCache();
  return toSnapshot({ integrations: record.integrations, security: record.security });
}

export async function logAdminAuditEvent({ actorUserId, targetProfileId, type, targetType, targetId, details }: AdminAuditEventPayload) {
  await writeAuditEvent({
    actorUserId,
    targetProfileId,
    action: type,
    targetType,
    targetId,
    metadata: details,
  });
}

export async function bumpSessionVersion(details?: Record<string, unknown>) {
  const current = await getAdminSettings({ fresh: true });
  const nextVersion = current.security.sessionVersion + 1;
  const updated = await updateAdminSettings({
    security: {
      sessionVersion: nextVersion,
    },
  });

  await logAdminAuditEvent({
    type: 'force_sign_out_all_sessions',
    details: {
      sessionVersion: nextVersion,
      ...(details ?? {}),
    },
  });

  return updated.security.sessionVersion;
}

export async function getCloudinaryFolderPath(pathSuffix = '') {
  const settings = await getAdminSettings();
  const baseFolder = settings.integrations.cloudinaryFolder.replace(/^\/+|\/+$/g, '');
  const suffix = pathSuffix.replace(/^\/+|\/+$/g, '');

  return suffix ? `${baseFolder}/${suffix}` : baseFolder;
}

export async function getAdminSettingsDashboardData() {
  const settings = await getAdminSettings({ fresh: true });
  const googleDriveOAuthConfigured = Boolean(process.env.GOOGLE_CLIENT_ID) && Boolean(process.env.GOOGLE_CLIENT_SECRET);

  const statuses: IntegrationStatus[] = [];

  try {
    await prisma.$queryRaw`SELECT 1`;
    statuses.push({
      key: 'database',
      label: 'Database',
      configured: true,
      state: 'connected',
      description: 'Database-backed portfolio and admin settings are reachable.',
    });
  } catch {
    statuses.push({
      key: 'database',
      label: 'Database',
      configured: false,
      state: 'warning',
      description: 'The database connection could not be confirmed.',
    });
  }

  const cloudinaryConfigured = Boolean(
    process.env.CLOUDINARY_NAME ||
      process.env.CLOUDINARY_CLOUD_NAME ||
      process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  ) &&
    Boolean(process.env.CLOUDINARY_KEY || process.env.CLOUDINARY_API_KEY) &&
    Boolean(process.env.CLOUDINARY_SECRET || process.env.CLOUDINARY_API_SECRET);
  statuses.push({
    key: 'cloudinary',
    label: 'Cloudinary',
    configured: cloudinaryConfigured,
    state: cloudinaryConfigured ? 'connected' : 'warning',
    description: cloudinaryConfigured
      ? `Uploads will use the "${settings.integrations.cloudinaryFolder}" base folder.`
      : 'Upload env variables are missing. Media uploads will fail until env configuration is restored.',
  });

  const resendConfigured = Boolean(process.env.RESEND_API_KEY);
  statuses.push({
    key: 'resend',
    label: 'Resend',
    configured: resendConfigured,
    state: resendConfigured ? 'connected' : 'warning',
    description: resendConfigured
      ? `Contact form email is configured for ${settings.integrations.contactRecipientEmail}.`
      : 'RESEND_API_KEY is missing. Contact submissions cannot be delivered.',
  });

  const unclothyConfigured = Boolean(process.env.UNCLOTHY_API_KEY) && Boolean(process.env.UNCLOTHY_API_BASE_URL);
  statuses.push({
    key: 'unclothy',
    label: 'Unclothy',
    configured: settings.integrations.unclothyEnabled && unclothyConfigured,
    state: !settings.integrations.unclothyEnabled ? 'disabled' : unclothyConfigured ? 'connected' : 'warning',
    description: settings.integrations.unclothyEnabled
      ? unclothyConfigured
        ? 'Unclothy integration is enabled globally. It is available to admins in Gallery → Media.'
        : 'Unclothy integration is enabled globally, but UNCLOTHY_API_KEY / UNCLOTHY_API_BASE_URL are missing.'
      : 'Unclothy integration is disabled by admin settings.',
  });

  statuses.push({
    key: 'googleDrive',
    label: 'Google Drive Import',
    configured: settings.integrations.googleDriveImportEnabled && googleDriveOAuthConfigured,
    state: !settings.integrations.googleDriveImportEnabled ? 'disabled' : googleDriveOAuthConfigured ? 'connected' : 'warning',
    description: settings.integrations.googleDriveImportEnabled
      ? googleDriveOAuthConfigured
        ? 'Google Drive imports are enabled globally. Each admin connects their own Google account from the import workflow.'
        : 'Google Drive imports are enabled globally, but Google OAuth client env variables are missing.'
      : 'Google Drive imports are disabled by admin settings.',
  });

  const events = await prisma.adminAuditEvent.findMany({
    take: 20,
    orderBy: { createdAt: 'desc' },
  });

  return {
    settings,
    statuses,
    events,
  };
}
