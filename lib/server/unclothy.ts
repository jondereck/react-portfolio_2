import { RequestValidationError } from '@/lib/server/uploads';

type UnclothyEnvelope<T> = {
  success?: boolean;
  status_code?: number;
  status_text?: string;
  message?: string;
  result?: T;
};

const DEFAULT_SETTINGS_PATH = '/v2/task/settings';

function requireEnv(name: string) {
  const value = process.env[name];
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

export function isUnclothyConfigured() {
  return Boolean(requireEnv('UNCLOTHY_API_KEY')) && Boolean(requireEnv('UNCLOTHY_API_BASE_URL'));
}

function buildUrl(path: string) {
  const base = requireEnv('UNCLOTHY_API_BASE_URL');
  if (!base) {
    throw new RequestValidationError(
      'Unclothy is not configured. Set UNCLOTHY_API_BASE_URL.',
      503,
      undefined,
      'UNCLOTHY_NOT_CONFIGURED',
    );
  }

  const normalizedBase = base.replace(/\/+$/, '');
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${normalizedBase}${normalizedPath}`;
}

function getApiKey() {
  const apiKey = requireEnv('UNCLOTHY_API_KEY');
  if (!apiKey) {
    throw new RequestValidationError(
      'Unclothy is not configured. Set UNCLOTHY_API_KEY.',
      503,
      undefined,
      'UNCLOTHY_NOT_CONFIGURED',
    );
  }
  return apiKey;
}

function mapUnclothyErrorCode(status: number) {
  if (status === 401) return 'UNCLOTHY_UNAUTHORIZED';
  if (status === 403) return 'UNCLOTHY_FORBIDDEN';
  if (status === 404) return 'UNCLOTHY_NOT_FOUND';
  if (status === 413) return 'UNCLOTHY_PAYLOAD_TOO_LARGE';
  if (status === 429) return 'UNCLOTHY_RATE_LIMITED';
  if (status >= 500) return 'UNCLOTHY_SERVER_ERROR';
  return 'UNCLOTHY_REQUEST_FAILED';
}

export async function unclothyFetchJson<T>(
  path: string,
  options: { method?: string; body?: unknown; signal?: AbortSignal } = {},
) {
  const response = await fetch(buildUrl(path), {
    method: options.method ?? (options.body ? 'POST' : 'GET'),
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'x-api-key': getApiKey(),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
    signal: options.signal,
    cache: 'no-store',
  });

  if (response.status >= 300 && response.status < 400) {
    const location = response.headers.get('location');
    throw new RequestValidationError(
      location
        ? `Unclothy request was redirected (${response.status}). Check UNCLOTHY_API_BASE_URL (it likely needs an /api prefix). Redirected to: ${location}`
        : `Unclothy request was redirected (${response.status}). Check UNCLOTHY_API_BASE_URL (it likely needs an /api prefix).`,
      502,
      undefined,
      'UNCLOTHY_REDIRECT',
      {
        providerStatus: response.status,
        location,
      },
    );
  }

  const payload = (await response.json().catch(() => ({}))) as UnclothyEnvelope<T> & Record<string, unknown>;

  if (!response.ok) {
    const message =
      (typeof payload?.message === 'string' && payload.message.trim()) ||
      (typeof payload?.status_text === 'string' && payload.status_text.trim()) ||
      `Unclothy request failed (${response.status}).`;
    throw new RequestValidationError(message, response.status, undefined, mapUnclothyErrorCode(response.status), {
      providerStatus: response.status,
      providerPayload: payload,
    });
  }

  return payload;
}

export async function getUnclothyCredits() {
  const payload = await unclothyFetchJson<{ credits?: number }>('/v2/user/credits', { method: 'GET' });
  return Number(payload?.result?.credits ?? 0);
}

export async function getUnclothyTask(taskId: string) {
  if (!taskId || typeof taskId !== 'string') {
    throw new RequestValidationError('Invalid task id.', 400, undefined, 'INVALID_TASK_ID');
  }
  return unclothyFetchJson<Record<string, unknown>>(`/v2/task/${encodeURIComponent(taskId)}`, { method: 'GET' });
}

export async function createUnclothyTask(input: { base64: string; webhook_url?: string; settings: Record<string, unknown> }) {
  if (!input?.base64 || typeof input.base64 !== 'string') {
    throw new RequestValidationError('base64 image payload is required.', 400, { base64: ['Required.'] }, 'MISSING_IMAGE_BASE64');
  }
  return unclothyFetchJson<{ task_id?: string }>('/v2/task/create', { method: 'POST', body: input });
}

export async function getUnclothyTaskSettings() {
  const settingsPath = requireEnv('UNCLOTHY_SETTINGS_PATH') || DEFAULT_SETTINGS_PATH;
  const payload = await unclothyFetchJson<Record<string, unknown>>(settingsPath, { method: 'GET' });
  return payload?.result ?? {};
}
