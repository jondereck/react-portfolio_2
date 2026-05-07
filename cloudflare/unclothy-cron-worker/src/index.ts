export interface Env {
  CRON_SECRET?: string;
  TARGET_URL?: string;
  WORKER_TARGET_URL?: string;
  UNCLOTHY_WORKER_STATE?: KVNamespace;
}

type KVNamespace = {
  get(key: string): Promise<string | null>;
};

// Minimal runtime types so this file typechecks without relying on external
// Cloudflare Workers type packages.
type ScheduledEvent = {
  cron: string;
  scheduledTime: number;
};

type ExecutionContext = {
  waitUntil(promise: Promise<unknown>): void;
};

const WORKER_ENABLED_KEY = 'unclothy:worker-enabled';

async function readResponseBody(response: Response) {
  const contentType = (response.headers.get('content-type') || '').toLowerCase();
  if (contentType.includes('application/json')) {
    return response.json().catch(() => null);
  }
  return response.text().catch(() => null);
}

async function pingWorker(env: Env) {
  let workerEnabled = false;
  try {
    const value = await env.UNCLOTHY_WORKER_STATE?.get(WORKER_ENABLED_KEY);
    workerEnabled = value === 'true';
  } catch (error) {
    console.error(
      JSON.stringify({
        tag: 'unclothy-cron',
        ok: false,
        skipped: true,
        reason: 'state-read-failed',
        error: error instanceof Error ? error.message : String(error),
      }),
    );
    return;
  }

  if (!workerEnabled) {
    console.log(
      JSON.stringify({
        tag: 'unclothy-cron',
        ok: true,
        skipped: true,
        reason: 'disabled',
      }),
    );
    return;
  }

  const rawTargetUrl =
    (typeof env.TARGET_URL === 'string' && env.TARGET_URL.trim()) ||
    (typeof env.WORKER_TARGET_URL === 'string' && env.WORKER_TARGET_URL.trim()) ||
    '';
  const targetUrl = rawTargetUrl.trim();
  if (!targetUrl) {
    console.error('[unclothy-cron] Missing TARGET_URL (or WORKER_TARGET_URL).');
    return;
  }

  const secret = typeof env.CRON_SECRET === 'string' ? env.CRON_SECRET.trim() : '';
  if (!secret) {
    console.error('[unclothy-cron] Missing CRON_SECRET.');
    return;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort('timeout'), 25_000);

  const startedAt = Date.now();

  try {
    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        accept: 'application/json',
        authorization: `Bearer ${secret}`,
        'user-agent': 'unclothy-cron-worker/1.0',
      },
      signal: controller.signal,
    });

    const body = await readResponseBody(response);
    const durationMs = Date.now() - startedAt;

    if (!response.ok) {
      console.error(
        JSON.stringify({
          tag: 'unclothy-cron',
          ok: false,
          status: response.status,
          durationMs,
          body,
        }),
      );
      return;
    }

    console.log(
      JSON.stringify({
        tag: 'unclothy-cron',
        ok: true,
        status: response.status,
        durationMs,
        body,
      }),
    );
  } catch (error) {
    const durationMs = Date.now() - startedAt;
    console.error(
      JSON.stringify({
        tag: 'unclothy-cron',
        ok: false,
        durationMs,
        error: error instanceof Error ? error.message : String(error),
      }),
    );
  } finally {
    clearTimeout(timeout);
  }
}

export default {
  scheduled(_event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(pingWorker(env));
  },
};
