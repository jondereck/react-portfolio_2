import { NextResponse } from 'next/server';
import { z } from 'zod';
import { canMutateContent } from '@/lib/auth/roles';
import { resolveRequestActor } from '@/lib/auth/session';
import { getAdminSettings, logAdminAuditEvent } from '@/lib/server/admin-settings';
import { isRateLimited } from '@/lib/server/rate-limit';
import { toErrorResponse } from '@/lib/server/api-responses';
import { RequestValidationError } from '@/lib/server/uploads';
import { assertPublicHttpUrl, readResponseTextLimited, safeFetch } from '@/lib/server/ssrf';
import { clampLimit, extractMediaUrlsFromHtml, tryProbeMedia } from '@/lib/server/media-scrape';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const previewSchema = z.object({
  url: z.string().trim().min(1).max(2000),
  useHeadless: z.boolean().optional().default(false),
  ignoreHttpsErrors: z.boolean().optional().default(false),
  maxItems: z.number().int().min(1).max(200).optional(),
});

async function extractWithHeadless(
  url: URL,
  timeoutMs: number,
  options: { ignoreHttpsErrors?: boolean } = {},
) {
  let chromium: any;
  try {
    ({ chromium } = await import('playwright'));
  } catch {
    throw new RequestValidationError(
      'Headless scraping is not installed. Install Playwright and browsers before enabling headless mode.',
      503,
      undefined,
      'PLAYWRIGHT_NOT_INSTALLED',
    );
  }

  const disableBrokenProxyEnv = () => {
    const keys = ['HTTP_PROXY', 'HTTPS_PROXY', 'ALL_PROXY', 'NO_PROXY'] as const;
    const previous: Partial<Record<(typeof keys)[number], string | undefined>> = {};
    const shouldDisable = (value?: string) => {
      if (!value) return false;
      const trimmed = value.trim();
      if (!trimmed) return false;
      // Common "dead proxy" placeholder.
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

  let browser: any = null;
  const restoreEnv = disableBrokenProxyEnv();
  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ ignoreHTTPSErrors: options.ignoreHttpsErrors === true });
    const page = await context.newPage();
    page.setDefaultNavigationTimeout(timeoutMs);
    page.setDefaultTimeout(timeoutMs);

    const responseKinds = new Map<string, 'image' | 'video'>();
    page.on('response', async (resp: any) => {
      try {
        const headers = await resp.allHeaders();
        const contentType = String(headers?.['content-type'] || headers?.['Content-Type'] || '').split(';')[0].trim().toLowerCase();
        if (!contentType) return;
        if (contentType.startsWith('image/')) {
          responseKinds.set(resp.url(), 'image');
          return;
        }
        if (contentType.startsWith('video/')) {
          responseKinds.set(resp.url(), 'video');
        }
      } catch {
        // ignore
      }
    });

    await page.goto(url.toString(), { waitUntil: 'networkidle' });

    // Many forums lazy-load media only after scrolling.
    for (let iteration = 0; iteration < 10; iteration += 1) {
      // eslint-disable-next-line no-await-in-loop
      const didScroll = await page.evaluate(() => {
        const previous = window.scrollY;
        window.scrollBy(0, Math.max(800, window.innerHeight));
        return window.scrollY !== previous;
      });

      // eslint-disable-next-line no-await-in-loop
      await page.waitForTimeout(650);

      if (!didScroll) {
        break;
      }
    }

    const result = await page.evaluate(() => {
      const urls = new Set<string>();

      const add = (value: string | null | undefined) => {
        const trimmed = String(value || '').trim();
        if (!trimmed) return;
        urls.add(trimmed);
      };

      const parseSrcset = (value: string) =>
        value
          .split(',')
          .map((part) => part.trim())
          .map((part) => part.split(/\s+/)[0])
          .filter(Boolean);

      for (const img of Array.from(document.images)) {
        add((img as any).currentSrc || img.src);
        const srcset = img.getAttribute('srcset');
        if (srcset) for (const entry of parseSrcset(srcset)) add(entry);
        add(img.getAttribute('data-src'));
        add(img.getAttribute('data-original'));
        add(img.getAttribute('data-url'));
        add(img.getAttribute('data-full-url'));
      }

      for (const source of Array.from(document.querySelectorAll('source'))) {
        add((source as HTMLSourceElement).src);
        const srcset = source.getAttribute('srcset');
        if (srcset) for (const entry of parseSrcset(srcset)) add(entry);
      }

      for (const video of Array.from(document.querySelectorAll('video'))) {
        add((video as HTMLVideoElement).src);
      }

      for (const anchor of Array.from(document.querySelectorAll('a[href]'))) {
        add((anchor as HTMLAnchorElement).href);
      }

      const title = (document.title || '').trim() || null;
      return { title, urls: Array.from(urls) };
    });

    return {
      title: typeof result?.title === 'string' ? result.title : null,
      urls: Array.isArray(result?.urls) ? result.urls.filter((entry) => typeof entry === 'string') : [],
      kinds: Object.fromEntries(responseKinds.entries()),
    };
  } catch (error) {
    const message = error instanceof Error && error.message ? error.message : 'Headless browser failed.';
    throw new RequestValidationError(
      `Headless browser failed: ${message}. If this is a certificate error, enable "Ignore HTTPS errors (insecure)". Ensure Playwright browsers are installed (run: npx playwright install).`,
      503,
      undefined,
      'PLAYWRIGHT_FAILED',
    );
  } finally {
    try {
      restoreEnv();
    } catch {
      // ignore
    }
    try {
      await browser?.close?.();
    } catch {
      // ignore
    }
  }
}

async function mapWithConcurrency<TIn, TOut>(
  items: TIn[],
  limit: number,
  fn: (item: TIn) => Promise<TOut>,
): Promise<TOut[]> {
  const results: TOut[] = new Array(items.length);
  let cursor = 0;

  const workers = new Array(Math.max(1, limit)).fill(null).map(async () => {
    while (true) {
      const index = cursor;
      cursor += 1;
      if (index >= items.length) return;
      // eslint-disable-next-line no-await-in-loop
      results[index] = await fn(items[index]);
    }
  });

  await Promise.all(workers);
  return results;
}

export async function POST(request: Request) {
  try {
    if (await isRateLimited(request, 'admin-mutation', 60, 60_000)) {
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
    const parsed = previewSchema.parse(body);

    const timeoutMs = settings.security.mediaScrapeTimeoutMs ?? 20_000;
    const pageUrl = await assertPublicHttpUrl(parsed.url);

    let title: string | null = null;
    let urls: string[] = [];

    try {
      const response = await safeFetch(pageUrl, { method: 'GET', cache: 'no-store', timeoutMs }, { maxRedirects: 4 });
      if (!response.ok) {
        throw new RequestValidationError(
          `Upstream returned HTTP ${response.status}.`,
          502,
          undefined,
          'UPSTREAM_HTTP_ERROR',
          { status: response.status },
        );
      }

      const html = await readResponseTextLimited(response, 5 * 1024 * 1024);
      const extracted = extractMediaUrlsFromHtml(html, pageUrl);
      title = extracted.title;
      urls = extracted.urls;
    } catch (fetchError) {
      if (!parsed.useHeadless) {
        throw fetchError;
      }

      const headless = await extractWithHeadless(pageUrl, timeoutMs, {
        ignoreHttpsErrors: parsed.ignoreHttpsErrors,
      });
      title = headless.title;
      urls = headless.urls
        .map((entry) => {
          try {
            return new URL(entry, pageUrl).toString();
          } catch {
            return null;
          }
        })
        .filter((entry): entry is string => Boolean(entry));
    }

    if (parsed.useHeadless && urls.length === 0) {
      const headless = await extractWithHeadless(pageUrl, timeoutMs, {
        ignoreHttpsErrors: parsed.ignoreHttpsErrors,
      });
      if (headless.title && !title) title = headless.title;
      urls = [...urls, ...headless.urls]
        .map((entry) => {
          try {
            return new URL(entry, pageUrl).toString();
          } catch {
            return null;
          }
        })
        .filter((entry): entry is string => Boolean(entry));
    }

    const deduped = [...new Set(urls)].filter((value) => /^https?:\/\//i.test(value));
    const maxItems = Math.min(
      clampLimit(parsed.maxItems, 1, 200, settings.security.mediaScrapeMaxItems ?? 50),
      settings.security.mediaScrapeMaxItems ?? 50,
    );
    const limited = deduped.slice(0, maxItems);

    const probeTimeout = Math.min(10_000, Math.max(4_000, Math.round(timeoutMs * 0.5)));
    const items = await mapWithConcurrency(limited, 6, (value) => tryProbeMedia(value, probeTimeout));

    // If headless saw the response content-type but HEAD probe couldn't classify it (common for CDNs without extensions),
    // use the headless type hint.
    if (parsed.useHeadless) {
      try {
        const headless = await extractWithHeadless(pageUrl, Math.min(timeoutMs, 10_000), {
          ignoreHttpsErrors: parsed.ignoreHttpsErrors,
        });
        const kindHints = headless?.kinds && typeof headless.kinds === 'object' ? headless.kinds : {};
        for (const item of items) {
          if (item.kind !== 'unknown') continue;
          const hint = (kindHints as any)[item.url];
          if (hint === 'image' || hint === 'video') {
            item.kind = hint;
          }
        }
      } catch {
        // ignore hint failures
      }
    }

    await logAdminAuditEvent({
      actorUserId: actor.user.id,
      type: 'media_scrape_preview',
      details: {
        host: pageUrl.host,
        itemCount: items.length,
        headlessUsed: parsed.useHeadless === true,
      },
    });

    return NextResponse.json({ pageUrl: pageUrl.toString(), title, items }, { status: 200 });
  } catch (error) {
    if (error instanceof RequestValidationError) {
      return NextResponse.json({ error: error.message, errorCode: error.errorCode, meta: error.meta }, { status: error.status ?? 400 });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || 'Validation failed.' }, { status: 400 });
    }
    return toErrorResponse(error, 'Unable to preview URL.');
  }
}
