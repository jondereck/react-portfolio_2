import { PassThrough, Readable } from 'node:stream';
import { NextResponse } from 'next/server';
import archiver from 'archiver';
import { z } from 'zod';
import { canMutateContent } from '@/lib/auth/roles';
import { resolveRequestActor } from '@/lib/auth/session';
import { getAdminSettings, logAdminAuditEvent } from '@/lib/server/admin-settings';
import { isRateLimited } from '@/lib/server/rate-limit';
import { toErrorResponse } from '@/lib/server/api-responses';
import {
  ALLOWED_IMAGE_MIME_TYPES,
  ALLOWED_VIDEO_MIME_TYPES,
  MAX_IMAGE_FILE_SIZE,
  MAX_VIDEO_FILE_SIZE,
  RequestValidationError,
} from '@/lib/server/uploads';
import { assertPublicHttpUrl, readResponseBufferLimited, safeFetch } from '@/lib/server/ssrf';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const downloadSchema = z.object({
  pageUrl: z.string().trim().min(1).max(2000),
  items: z.array(z.string().trim().min(1).max(2000)).min(1).max(200),
  useHeadless: z.boolean().optional().default(false),
  ignoreHttpsErrors: z.boolean().optional().default(false),
});

const MIME_EXTENSION_MAP: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'video/mp4': 'mp4',
  'video/quicktime': 'mov',
  'video/webm': 'webm',
  'video/x-matroska': 'mkv',
};

const sanitizeFilenamePart = (value: string) => {
  const trimmed = value.trim().replace(/\s+/g, ' ');
  const sanitized = trimmed.replace(/[\\/:*?"<>|\u0000-\u001f]/g, '-');
  return sanitized.slice(0, 120).trim() || 'file';
};

const getExtensionFromUrl = (value: string) => {
  const withoutQuery = value.split('?')[0];
  const match = withoutQuery.toLowerCase().match(/\.([a-z0-9]{2,8})$/);
  return match ? match[1] : '';
};

const resolveExtension = (mimeType: string | null, url: string) => {
  if (mimeType) {
    const fromMime = MIME_EXTENSION_MAP[mimeType.toLowerCase()];
    if (fromMime) return fromMime;
  }
  return getExtensionFromUrl(url) || '';
};

const buildZipFilename = (host: string, now = new Date()) => {
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const safeHost = sanitizeFilenamePart(host.toLowerCase().replace(/[^a-z0-9.-]/g, '-'));
  return `${safeHost}-media-${yyyy}${mm}${dd}.zip`;
};

export async function POST(request: Request) {
  try {
    if (await isRateLimited(request, 'admin-mutation', 30, 60_000)) {
      return NextResponse.json({ error: 'Too many requests. Try again later.' }, { status: 429 });
    }

    const actor = await resolveRequestActor(request);
    if (!actor) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!canMutateContent(actor.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const settings = await getAdminSettings();
    if (!settings.integrations.mediaScrapeEnabled) {
      return NextResponse.json({ error: 'Media Scraper is disabled by admin settings.' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = downloadSchema.parse(body);

    const timeoutMs = settings.security.mediaScrapeTimeoutMs ?? 20_000;
    const maxFiles = settings.security.mediaScrapeMaxZipFiles ?? 50;
    const urls = parsed.items.slice(0, maxFiles);

    const pageUrl = await assertPublicHttpUrl(parsed.pageUrl);
    const filename = buildZipFilename(pageUrl.host);

    const archive = archiver('zip', { zlib: { level: 9 } });
    const output = new PassThrough();

    const skipped: Array<{ url: string; reason: string }> = [];
    const nameCounts = new Map<string, number>();
    const sequenceWidth = Math.max(2, String(Math.max(urls.length, 1)).length);
    let includedCount = 0;

    archive.pipe(output);

    const appendEntry = async (entryUrl: string, index: number, fetcher: (url: URL) => Promise<Response>) => {
      let mediaUrl: URL;
      try {
        mediaUrl = await assertPublicHttpUrl(entryUrl);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'URL not allowed.';
        skipped.push({ url: entryUrl, reason: message });
        return;
      }

      let response: Response;
      try {
        response = await fetcher(mediaUrl);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Fetch failed.';
        skipped.push({ url: entryUrl, reason: message });
        return;
      }

      if (!response.ok) {
        skipped.push({ url: entryUrl, reason: `Upstream returned HTTP ${response.status}.` });
        return;
      }

      const mime = (response.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
      const isImage = mime && ALLOWED_IMAGE_MIME_TYPES.has(mime);
      const isVideo = mime && ALLOWED_VIDEO_MIME_TYPES.has(mime);
      const kind = isImage ? 'image' : isVideo ? 'video' : '';
      if (!kind) {
        skipped.push({ url: entryUrl, reason: mime ? `Unsupported content-type: ${mime}` : 'Missing content-type header.' });
        return;
      }

      const maxBytes = kind === 'video' ? MAX_VIDEO_FILE_SIZE : MAX_IMAGE_FILE_SIZE;
      const contentLengthRaw = response.headers.get('content-length');
      const contentLength = contentLengthRaw ? Number(contentLengthRaw) : NaN;
      if (Number.isFinite(contentLength) && contentLength > maxBytes) {
        skipped.push({ url: entryUrl, reason: `File is too large (${contentLength} bytes).` });
        return;
      }

      let buffer: Buffer;
      try {
        buffer = await readResponseBufferLimited(response, maxBytes);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Download failed.';
        skipped.push({ url: entryUrl, reason: message });
        return;
      }

      const sequence = String(index + 1).padStart(sequenceWidth, '0');
      const baseName = sanitizeFilenamePart(mediaUrl.pathname.split('/').pop() || `${kind}-${index + 1}`);
      const ext = resolveExtension(mime || null, mediaUrl.toString()) || (kind === 'video' ? 'mp4' : 'jpg');
      const preferred = `${baseName.replace(/\.[a-z0-9]{2,8}$/i, '')}.${ext}`;
      const seen = nameCounts.get(preferred) ?? 0;
      nameCounts.set(preferred, seen + 1);
      const finalName = seen === 0 ? preferred : `${preferred.replace(/(\.[a-z0-9]{2,8})$/i, '')}-${seen + 1}.${ext}`;

      archive.append(buffer, { name: `${sequence}-${finalName}` });
      includedCount += 1;
    };

    const disableBrokenProxyEnv = () => {
      const keys = ['HTTP_PROXY', 'HTTPS_PROXY', 'ALL_PROXY', 'NO_PROXY'] as const;
      const previous: Partial<Record<(typeof keys)[number], string | undefined>> = {};
      const shouldDisable = (value?: string) => {
        if (!value) return false;
        const trimmed = value.trim();
        if (!trimmed) return false;
        return /^https?:\/\/(127\.0\.0\.1|localhost|0\.0\.0\.0):9\/?$/i.test(trimmed);
      };

      for (const key of keys) {
        const value = process.env[key];
        if (shouldDisable(value)) {
          previous[key] = value;
          delete process.env[key];
        }
      }

      return () => {
        for (const key of keys) {
          if (Object.prototype.hasOwnProperty.call(previous, key)) {
            const value = previous[key];
            if (value === undefined) delete process.env[key];
            else process.env[key] = value;
          }
        }
      };
    };

    void (async () => {
      try {
        let fetcher: (url: URL) => Promise<Response> = (url) =>
          safeFetch(url, { method: 'GET', cache: 'no-store', timeoutMs }, { maxRedirects: 4 });

        let playwrightBrowser: any = null;
        let playwrightContext: any = null;
        let restoreEnv: (() => void) | null = null;

        if (parsed.useHeadless) {
          restoreEnv = disableBrokenProxyEnv();
          let chromium: any;
          try {
            ({ chromium } = await import('playwright'));
          } catch {
            throw new RequestValidationError(
              'Headless downloads require Playwright. Install Playwright and browsers (run: npx playwright install).',
              503,
              undefined,
              'PLAYWRIGHT_NOT_INSTALLED',
            );
          }

          try {
            playwrightBrowser = await chromium.launch({ headless: true });
            playwrightContext = await playwrightBrowser.newContext({ ignoreHTTPSErrors: parsed.ignoreHttpsErrors === true });
            const requestContext = playwrightContext.request;
            fetcher = async (url) => {
              const response = await requestContext.get(url.toString(), { timeout: timeoutMs });
              // Adapt Playwright APIResponse to a fetch-like Response
              const headers = new Headers();
              const all = response.headers();
              for (const key of Object.keys(all)) headers.set(key, all[key]);
              const buffer = await response.body();
              return new Response(buffer, { status: response.status(), headers });
            };
          } catch (error) {
            const message = error instanceof Error && error.message ? error.message : 'Headless browser failed.';
            throw new RequestValidationError(
              `Headless browser failed: ${message}. If this is a certificate error, enable "Ignore HTTPS errors (insecure)". Ensure Playwright browsers are installed (run: npx playwright install).`,
              503,
              undefined,
              'PLAYWRIGHT_FAILED',
            );
          }
        }

        for (let index = 0; index < urls.length; index += 1) {
          // eslint-disable-next-line no-await-in-loop
          await appendEntry(urls[index], index, fetcher);
        }

        const manifest = {
          pageUrl: pageUrl.toString(),
          requestedCount: urls.length,
          includedCount,
          skippedCount: skipped.length,
          skipped,
        };
        archive.append(JSON.stringify(manifest, null, 2), { name: 'manifest.json' });

        await archive.finalize();

        try {
          await playwrightContext?.close?.();
        } catch {
          // ignore
        }
        try {
          await playwrightBrowser?.close?.();
        } catch {
          // ignore
        }
        try {
          restoreEnv?.();
        } catch {
          // ignore
        }
      } catch (error) {
        output.destroy(error as Error);
      }
    })();

    await logAdminAuditEvent({
      actorUserId: actor.user.id,
      type: 'media_scrape_download',
      details: {
        host: pageUrl.host,
        requestedCount: urls.length,
      },
    });

    const headers = new Headers({
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      'Cache-Control': 'no-store',
      'X-Requested-Count': String(urls.length),
    });

    const stream = Readable.toWeb(output) as ReadableStream<Uint8Array>;
    return new Response(stream, { status: 200, headers });
  } catch (error) {
    if (error instanceof RequestValidationError) {
      return NextResponse.json({ error: error.message, errorCode: error.errorCode, meta: error.meta }, { status: error.status ?? 400 });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || 'Validation failed.' }, { status: 400 });
    }
    return toErrorResponse(error, 'Unable to download ZIP.');
  }
}
