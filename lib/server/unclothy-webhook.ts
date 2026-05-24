import { createHmac, timingSafeEqual } from 'node:crypto';

const WEBHOOK_PATH_PREFIX = '/api/webhooks/unclothy';

function readEnv(name: string) {
  const value = process.env[name];
  return typeof value === 'string' && value.trim() ? value.trim() : '';
}

function signWebhookTaskId(taskId: string, secret: string) {
  return createHmac('sha256', secret).update(taskId).digest('hex');
}

export function buildUnclothyWebhookUrl(taskId: string) {
  const baseUrl = readEnv('UNCLOTHY_WEBHOOK_BASE_URL');
  const secret = readEnv('UNCLOTHY_WEBHOOK_SECRET');
  if (!baseUrl || !secret || !taskId) {
    return null;
  }

  try {
    const url = new URL(`${WEBHOOK_PATH_PREFIX}/${encodeURIComponent(taskId)}`, baseUrl.replace(/\/+$/, ''));
    url.searchParams.set('signature', signWebhookTaskId(taskId, secret));
    return url.toString();
  } catch {
    return null;
  }
}

export function verifyUnclothyWebhookSignature(taskId: string, signature: string | null) {
  const secret = readEnv('UNCLOTHY_WEBHOOK_SECRET');
  if (!secret || !taskId || !signature) {
    return false;
  }

  const expected = signWebhookTaskId(taskId, secret);
  const received = signature.trim();
  if (!/^[a-f0-9]{64}$/i.test(received)) {
    return false;
  }

  const expectedBuffer = Buffer.from(expected, 'hex');
  const receivedBuffer = Buffer.from(received, 'hex');
  return expectedBuffer.length === receivedBuffer.length && timingSafeEqual(expectedBuffer, receivedBuffer);
}
