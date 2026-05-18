const WORKER_ENABLED_KEY = 'unclothy:worker-enabled';
const DEFAULT_WORKER_SCRIPT_NAME = 'unclothy-cron-worker';
const DEFAULT_WORKER_CRON_EXPRESSION = '* * * * *';
const CONTROL_LOG_TAG = 'unclothy-worker-control';

type CloudflareApiErrorEntry = {
  message?: unknown;
};

type CloudflareApiEnvelope<T> = {
  success?: boolean;
  errors?: CloudflareApiErrorEntry[];
  result?: T;
};

type CloudflareSchedule = {
  cron: string;
};

export type CloudflareUnclothyWorkerSyncResult = {
  enabled: boolean;
  scriptName: string;
  kvValue: 'true' | 'false';
  schedules: string[];
};

export class CloudflareUnclothyWorkerSyncError extends Error {
  errorCode: string;

  constructor(message: string, errorCode = 'UNCLOTHY_WORKER_SYNC_FAILED') {
    super(message);
    this.name = 'CloudflareUnclothyWorkerSyncError';
    this.errorCode = errorCode;
  }
}

function requireEnv(name: string) {
  const value = process.env[name];
  return typeof value === 'string' && value.trim() ? value.trim() : '';
}

function readEnv(name: string) {
  const value = process.env[name];
  return typeof value === 'string' && value.trim() ? value.trim() : '';
}

function logControl(event: string, details: Record<string, unknown>) {
  console.info(
    JSON.stringify({
      tag: CONTROL_LOG_TAG,
      event,
      at: new Date().toISOString(),
      ...details,
    }),
  );
}

async function readCloudflareError(response: Response) {
  const contentType = (response.headers.get('content-type') || '').toLowerCase();
  if (contentType.includes('application/json')) {
    const payload = await response.json().catch(() => null);
    const message = Array.isArray(payload?.errors)
      ? payload.errors.map((entry: { message?: unknown }) => (typeof entry?.message === 'string' ? entry.message : '')).filter(Boolean).join('; ')
      : '';
    return message || JSON.stringify(payload);
  }

  return response.text().catch(() => '');
}

function extractCloudflareMessages(payload: CloudflareApiEnvelope<unknown> | null) {
  if (!payload || !Array.isArray(payload.errors) || payload.errors.length === 0) {
    return '';
  }

  return payload.errors
    .map((entry) => (typeof entry?.message === 'string' ? entry.message : ''))
    .filter(Boolean)
    .join('; ');
}

async function putCloudflareWorkerSchedules(input: {
  accountId: string;
  apiToken: string;
  scriptName: string;
  schedules: CloudflareSchedule[];
}) {
  const url = `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(input.accountId)}/workers/scripts/${encodeURIComponent(
    input.scriptName,
  )}/schedules`;

  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${input.apiToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input.schedules),
    cache: 'no-store',
  });

  const payload = (await response.json().catch(() => null)) as CloudflareApiEnvelope<{ schedules?: CloudflareSchedule[] }> | null;
  if (!response.ok || payload?.success === false) {
    const details = extractCloudflareMessages(payload);
    throw new CloudflareUnclothyWorkerSyncError(
      details
        ? `Unable to update Cloudflare worker cron schedules (${response.status}). ${details}`
        : `Unable to update Cloudflare worker cron schedules (${response.status}).`,
    );
  }

  return Array.isArray(payload?.result?.schedules) ? payload.result.schedules : input.schedules;
}

export async function syncUnclothyWorkerEnabledToCloudflare(enabled: boolean): Promise<CloudflareUnclothyWorkerSyncResult> {
  const accountId = requireEnv('CLOUDFLARE_ACCOUNT_ID');
  const apiToken = requireEnv('CLOUDFLARE_API_TOKEN');
  const namespaceId = requireEnv('UNCLOTHY_WORKER_KV_NAMESPACE_ID');
  const scriptName =
    readEnv('CLOUDFLARE_UNCLOTHY_WORKER_SCRIPT_NAME') ||
    readEnv('CLOUDFLARE_WORKER_SCRIPT_NAME') ||
    DEFAULT_WORKER_SCRIPT_NAME;
  const enabledCronExpression = readEnv('UNCLOTHY_WORKER_CRON_EXPRESSION') || DEFAULT_WORKER_CRON_EXPRESSION;

  const missing = [
    accountId ? null : 'CLOUDFLARE_ACCOUNT_ID',
    apiToken ? null : 'CLOUDFLARE_API_TOKEN',
    namespaceId ? null : 'UNCLOTHY_WORKER_KV_NAMESPACE_ID',
  ].filter(Boolean);

  if (missing.length > 0) {
    throw new CloudflareUnclothyWorkerSyncError(
      `Cloudflare worker control is not configured. Set ${missing.join(', ')} before changing this setting.`,
      'UNCLOTHY_WORKER_SYNC_NOT_CONFIGURED',
    );
  }

  if (enabled && !enabledCronExpression) {
    throw new CloudflareUnclothyWorkerSyncError(
      'UNCLOTHY_WORKER_CRON_EXPRESSION is required when enabling the worker schedule.',
      'UNCLOTHY_WORKER_SYNC_NOT_CONFIGURED',
    );
  }

  const url = `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId)}/storage/kv/namespaces/${encodeURIComponent(
    namespaceId,
  )}/values/${encodeURIComponent(WORKER_ENABLED_KEY)}`;

  logControl('sync-start', {
    enabled,
    scriptName,
    desiredSchedules: enabled ? [enabledCronExpression] : [],
  });

  try {
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${apiToken}`,
        'Content-Type': 'text/plain',
      },
      body: enabled ? 'true' : 'false',
      cache: 'no-store',
    });

    if (!response.ok) {
      const details = await readCloudflareError(response);
      throw new CloudflareUnclothyWorkerSyncError(
        details
          ? `Unable to update Cloudflare worker control (${response.status}). ${details}`
          : `Unable to update Cloudflare worker control (${response.status}).`,
      );
    }

    const updatedSchedules = await putCloudflareWorkerSchedules({
      accountId,
      apiToken,
      scriptName,
      schedules: enabled ? [{ cron: enabledCronExpression }] : [],
    });

    const result: CloudflareUnclothyWorkerSyncResult = {
      enabled,
      scriptName,
      kvValue: enabled ? 'true' : 'false',
      schedules: updatedSchedules.map((entry) => entry.cron).filter(Boolean),
    };

    logControl('sync-success', result);
    return result;
  } catch (error) {
    logControl('sync-failed', {
      enabled,
      scriptName,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}
