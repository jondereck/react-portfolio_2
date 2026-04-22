import { load } from 'cheerio';
import { RequestValidationError } from '@/lib/server/uploads';
import { assertPublicHttpUrl, safeFetch } from '@/lib/server/ssrf';

const IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif']);
const VIDEO_EXTENSIONS = new Set(['mp4', 'mov', 'webm', 'mkv']);

export type ScrapedMediaKind = 'image' | 'video' | 'unknown';

export type ScrapedMediaItem = {
  url: string;
  kind: ScrapedMediaKind;
  contentType?: string | null;
  contentLength?: number | null;
  filenameHint?: string | null;
  blockedReason?: string | null;
};

function normalizeExtension(value: string) {
  const withoutQuery = value.split('?')[0];
  const last = withoutQuery.split('/').pop() || '';
  const dot = last.lastIndexOf('.');
  if (dot <= 0) return '';
  return last.slice(dot + 1).toLowerCase();
}

export function guessKindFromUrl(value: string): ScrapedMediaKind {
  const ext = normalizeExtension(value);
  if (IMAGE_EXTENSIONS.has(ext)) return 'image';
  if (VIDEO_EXTENSIONS.has(ext)) return 'video';
  return 'unknown';
}

function parseSrcset(value: string) {
  return value
    .split(',')
    .map((part) => part.trim())
    .map((part) => part.split(/\s+/)[0])
    .filter(Boolean);
}

function toAbsoluteUrl(raw: string, baseUrl: URL) {
  const trimmed = String(raw || '').trim();
  if (!trimmed) return null;
  try {
    const resolved = new URL(trimmed, baseUrl);
    if (resolved.protocol !== 'http:' && resolved.protocol !== 'https:') return null;
    return resolved.toString();
  } catch {
    return null;
  }
}

export function extractMediaUrlsFromHtml(html: string, baseUrl: URL) {
  const $ = load(html);
  const title = $('title').first().text().trim() || null;
  const urls = new Set<string>();

  const add = (raw: string | undefined | null) => {
    const resolved = raw ? toAbsoluteUrl(raw, baseUrl) : null;
    if (resolved) urls.add(resolved);
  };

  $('img').each((_, el) => {
    const src = $(el).attr('src');
    const dataSrc = $(el).attr('data-src') || $(el).attr('data-original');
    if (dataSrc) add(dataSrc);
    if (src) add(src);
    const srcset = $(el).attr('srcset');
    if (srcset) {
      for (const entry of parseSrcset(srcset)) add(entry);
    }
  });

  $('source').each((_, el) => {
    const src = $(el).attr('src');
    if (src) add(src);
    const srcset = $(el).attr('srcset');
    if (srcset) {
      for (const entry of parseSrcset(srcset)) add(entry);
    }
  });

  $('video').each((_, el) => {
    const src = $(el).attr('src');
    if (src) add(src);
  });

  $('video source').each((_, el) => {
    const src = $(el).attr('src');
    if (src) add(src);
  });

  $('a').each((_, el) => {
    const href = $(el).attr('href');
    if (!href) return;
    const resolved = toAbsoluteUrl(href, baseUrl);
    if (!resolved) return;
    const ext = normalizeExtension(resolved);
    if (IMAGE_EXTENSIONS.has(ext) || VIDEO_EXTENSIONS.has(ext)) {
      urls.add(resolved);
    }
  });

  return { title, urls: [...urls] };
}

export async function tryProbeMedia(url: string, timeoutMs: number) {
  try {
    await assertPublicHttpUrl(url);
  } catch (error) {
    if (error instanceof RequestValidationError) {
      return {
        url,
        kind: guessKindFromUrl(url),
        blockedReason: error.message,
      } satisfies ScrapedMediaItem;
    }
    return {
      url,
      kind: guessKindFromUrl(url),
      blockedReason: 'URL is not allowed.',
    } satisfies ScrapedMediaItem;
  }

  try {
    const response = await safeFetch(url, { method: 'HEAD', cache: 'no-store', timeoutMs }, { maxRedirects: 4 });
    const contentType = response.headers.get('content-type');
    const contentLengthRaw = response.headers.get('content-length');
    const contentLength = contentLengthRaw ? Number(contentLengthRaw) : null;
    const kind: ScrapedMediaKind =
      contentType && contentType.toLowerCase().startsWith('image/')
        ? 'image'
        : contentType && contentType.toLowerCase().startsWith('video/')
          ? 'video'
          : guessKindFromUrl(url);

    return {
      url,
      kind,
      contentType,
      contentLength: Number.isFinite(contentLength) ? contentLength : null,
      filenameHint: null,
      blockedReason: null,
    } satisfies ScrapedMediaItem;
  } catch {
    return {
      url,
      kind: guessKindFromUrl(url),
      blockedReason: null,
    } satisfies ScrapedMediaItem;
  }
}

export function clampLimit(value: unknown, min: number, max: number, fallback: number) {
  const num = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(num)));
}

