import dns from 'node:dns';
import ipaddr from 'ipaddr.js';
import { RequestValidationError } from '@/lib/server/uploads';

const dnsLookup = dns.promises.lookup;

const disallowedHostnames = new Set(['localhost']);

function toValidationError(message: string, errorCode: string, meta?: Record<string, unknown>) {
  return new RequestValidationError(message, 400, undefined, errorCode, meta);
}

function isHttpProtocol(url: URL) {
  return url.protocol === 'http:' || url.protocol === 'https:';
}

function isDisallowedHostname(hostname: string) {
  const normalized = hostname.trim().toLowerCase();
  if (!normalized) return true;
  if (disallowedHostnames.has(normalized)) return true;
  if (normalized.endsWith('.local')) return true;
  return false;
}

function isPublicIp(address: string) {
  if (!ipaddr.isValid(address)) {
    return false;
  }

  const parsed = ipaddr.parse(address);
  const range = parsed.range();

  // Only allow globally routable addresses.
  // ipaddr.js returns values like: unicast, private, loopback, linkLocal, multicast, reserved, etc.
  return range === 'unicast';
}

async function assertPublicDnsHost(hostname: string) {
  let records: Array<{ address: string; family: number }>;
  try {
    records = await dnsLookup(hostname, { all: true, verbatim: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'DNS lookup failed.';
    throw toValidationError(`Unable to resolve host: ${message}`, 'DNS_LOOKUP_FAILED', { hostname });
  }

  if (!records || records.length === 0) {
    throw toValidationError('Host did not resolve to an IP address.', 'DNS_LOOKUP_EMPTY', { hostname });
  }

  for (const record of records) {
    if (!isPublicIp(record.address)) {
      throw toValidationError('URL resolves to a private or non-public IP address.', 'UNSAFE_HOST_IP', {
        hostname,
        address: record.address,
        family: record.family,
      });
    }
  }
}

export async function assertPublicHttpUrl(value: string) {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw toValidationError('Invalid URL.', 'INVALID_URL');
  }

  if (!isHttpProtocol(url)) {
    throw toValidationError('Only http/https URLs are allowed.', 'UNSUPPORTED_URL_PROTOCOL');
  }

  if (url.username || url.password) {
    throw toValidationError('URL credentials are not allowed.', 'UNSAFE_URL_CREDENTIALS');
  }

  const hostname = url.hostname;
  if (isDisallowedHostname(hostname)) {
    throw toValidationError('This host is not allowed.', 'UNSAFE_HOSTNAME', { hostname });
  }

  if (ipaddr.isValid(hostname)) {
    if (!isPublicIp(hostname)) {
      throw toValidationError('URL points to a private or non-public IP address.', 'UNSAFE_HOST_IP', { hostname });
    }
  } else {
    await assertPublicDnsHost(hostname);
  }

  return url;
}

export async function safeFetch(
  input: string | URL,
  init: RequestInit & { timeoutMs?: number } = {},
  options: { maxRedirects?: number } = {},
) {
  const maxRedirects = Number.isFinite(options.maxRedirects) ? Number(options.maxRedirects) : 5;
  const timeoutMs = Number.isFinite((init as any).timeoutMs) ? Number((init as any).timeoutMs) : 15_000;

  let current = typeof input === 'string' ? await assertPublicHttpUrl(input) : await assertPublicHttpUrl(input.toString());
  let redirectCount = 0;
  const headers = init.headers instanceof Headers ? init.headers : new Headers(init.headers);
  if (!headers.has('User-Agent')) {
    headers.set('User-Agent', 'portfolio-admin-media-scraper/1.0');
  }

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(current.toString(), {
        ...init,
        headers,
        redirect: 'manual',
        signal: controller.signal,
      });

      if (response.status >= 300 && response.status < 400 && response.headers.get('location')) {
        if (redirectCount >= maxRedirects) {
          throw toValidationError('Too many redirects.', 'TOO_MANY_REDIRECTS');
        }

        const location = response.headers.get('location') || '';
        const nextUrl = new URL(location, current);
        current = await assertPublicHttpUrl(nextUrl.toString());
        redirectCount += 1;

        const method = (init.method || 'GET').toUpperCase();
        if (response.status === 303 && method !== 'GET' && method !== 'HEAD') {
          init = { ...init, method: 'GET' };
        }

        continue;
      }

      return response;
    } catch (error) {
      if (error instanceof RequestValidationError) {
        throw error;
      }
      const baseMessage = error instanceof Error && error.message ? error.message : 'Fetch failed.';
      const causeAny = (error as any)?.cause;
      const causeMessage =
        causeAny && typeof causeAny === 'object' && typeof causeAny.message === 'string'
          ? String(causeAny.message)
          : null;
      const causeCode =
        causeAny && typeof causeAny === 'object' && typeof causeAny.code === 'string'
          ? String(causeAny.code)
          : typeof (error as any)?.code === 'string'
            ? String((error as any).code)
            : null;

      const detailedMessage = causeMessage && causeMessage !== baseMessage
        ? `${causeMessage}${causeCode ? ` (${causeCode})` : ''}`
        : `${baseMessage}${causeCode && !baseMessage.includes(causeCode) ? ` (${causeCode})` : ''}`;

      throw toValidationError(`Upstream request failed: ${detailedMessage}`, 'UPSTREAM_FETCH_FAILED', { url: current.toString() });
    } finally {
      clearTimeout(timeout);
    }
  }
}

export async function readResponseTextLimited(response: Response, maxBytes: number) {
  if (!response.body) {
    return '';
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  while (true) {
    // eslint-disable-next-line no-await-in-loop
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    total += value.byteLength;
    if (total > maxBytes) {
      try {
        reader.cancel();
      } catch {
        // ignore
      }
      throw toValidationError('Upstream HTML is too large to preview.', 'UPSTREAM_HTML_TOO_LARGE', { maxBytes });
    }
    chunks.push(value);
  }

  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return new TextDecoder('utf-8', { fatal: false }).decode(merged);
}

export async function readResponseBufferLimited(response: Response, maxBytes: number) {
  if (!response.body) {
    return Buffer.alloc(0);
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  while (true) {
    // eslint-disable-next-line no-await-in-loop
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    total += value.byteLength;
    if (total > maxBytes) {
      try {
        reader.cancel();
      } catch {
        // ignore
      }
      throw toValidationError('Upstream media exceeds the configured size limit.', 'UPSTREAM_MEDIA_TOO_LARGE', { maxBytes });
    }
    chunks.push(value);
  }

  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return Buffer.from(merged.buffer, merged.byteOffset, merged.byteLength);
}
