const WORKER_ENABLED_KEY = 'unclothy:worker-enabled';

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

export async function syncUnclothyWorkerEnabledToCloudflare(enabled: boolean) {
  const accountId = requireEnv('CLOUDFLARE_ACCOUNT_ID');
  const apiToken = requireEnv('CLOUDFLARE_API_TOKEN');
  const namespaceId = requireEnv('UNCLOTHY_WORKER_KV_NAMESPACE_ID');

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

  const url = `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId)}/storage/kv/namespaces/${encodeURIComponent(
    namespaceId,
  )}/values/${encodeURIComponent(WORKER_ENABLED_KEY)}`;

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
}
