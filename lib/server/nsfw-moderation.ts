import OpenAI from 'openai';
import { isSafeHttpUrl } from '@/lib/url-safety';

const DEFAULT_MODERATION_MODEL = 'omni-moderation-latest';
const DEFAULT_THRESHOLD = 0.5;
const SUPPORTED_IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif']);

const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

type ModerationPayload = {
  id?: string;
  model?: string;
  results?: Array<{
    flagged?: boolean;
    categories?: Record<string, boolean | null>;
    category_scores?: Record<string, number | null>;
  }>;
};

export type NsfwModerationSummary = {
  nsfwDetected: boolean;
  nsfwScores: {
    provider: 'openai';
    requestId?: string;
    model: string;
    threshold: number;
    relevantKeys: string[];
    flagged: boolean;
    categories: Record<string, boolean | null>;
    category_scores: Record<string, number | null>;
  };
};

export function isNsfwModerationConfigured() {
  return Boolean(openai);
}

function resolveRelevantKeys(payload: {
  categories?: Record<string, boolean | null>;
  scores?: Record<string, number | null>;
}) {
  const keys = new Set<string>();
  for (const key of Object.keys(payload.categories ?? {})) keys.add(key);
  for (const key of Object.keys(payload.scores ?? {})) keys.add(key);
  return [...keys].filter((key) => /sexual|nudity/i.test(key));
}

function tryParseUrl(value: string) {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

function extractUrlExtension(value: string) {
  const url = tryParseUrl(value);
  const pathname = url ? url.pathname : value;
  const last = pathname.split('/').pop() || '';
  const dot = last.lastIndexOf('.');
  if (dot <= 0) return '';
  return last.slice(dot + 1).toLowerCase();
}

function isCloudinaryImageUploadUrl(value: string) {
  const url = tryParseUrl(value);
  if (!url) return false;
  return /res\.cloudinary\.com$/i.test(url.host) && url.pathname.includes('/image/upload/');
}

function toCloudinaryJpgUrl(value: string) {
  const url = tryParseUrl(value);
  if (!url) return value;
  if (!url.pathname.includes('/image/upload/')) return value;

  // Ensure OpenAI receives a common, supported image format even when the original asset
  // is HEIC/AVIF or Cloudinary serves it without a recognizable extension.
  // Insert a safe transformation right after `/upload/`.
  url.pathname = url.pathname.replace('/image/upload/', '/image/upload/f_jpg,q_auto/');
  return url.toString();
}

export async function moderateImageUrlForNsfw(options: {
  imageUrl: string;
  threshold?: number;
  signal?: AbortSignal;
}): Promise<NsfwModerationSummary | null> {
  if (!openai) return null;
  if (!options?.imageUrl || typeof options.imageUrl !== 'string') return null;
  if (!isSafeHttpUrl(options.imageUrl)) return null;

  let imageUrl = options.imageUrl;
  const ext = extractUrlExtension(imageUrl);
  if (isCloudinaryImageUploadUrl(imageUrl) && (!ext || !SUPPORTED_IMAGE_EXTENSIONS.has(ext))) {
    imageUrl = toCloudinaryJpgUrl(imageUrl);
  }

  const model =
    process.env.OPENAI_NSFW_MODERATION_MODEL ||
    process.env.OPENAI_NSFW_MODEL ||
    DEFAULT_MODERATION_MODEL;
  const threshold = typeof options.threshold === 'number' && Number.isFinite(options.threshold)
    ? options.threshold
    : DEFAULT_THRESHOLD;

  const response = (await openai.moderations.create(
    {
      model,
      input: [
        {
          type: 'image_url',
          image_url: { url: imageUrl },
        },
      ],
    },
    { signal: options.signal },
  )) as unknown as ModerationPayload;

  const result = Array.isArray(response?.results) ? response.results[0] : null;
  if (!result) return null;

  const categories = (result.categories && typeof result.categories === 'object' ? result.categories : {}) as Record<
    string,
    boolean | null
  >;
  const scores = (result.category_scores && typeof result.category_scores === 'object' ? result.category_scores : {}) as Record<
    string,
    number | null
  >;

  const relevantKeys = resolveRelevantKeys({ categories, scores });
  const flaggedByCategory = relevantKeys.some((key) => categories[key] === true);
  const flaggedByScore = relevantKeys.some((key) => typeof scores[key] === 'number' && (scores[key] ?? 0) >= threshold);

  const nsfwDetected = Boolean(flaggedByCategory || flaggedByScore);

  return {
    nsfwDetected,
    nsfwScores: {
      provider: 'openai',
      requestId: typeof response?.id === 'string' ? response.id : undefined,
      model: typeof response?.model === 'string' && response.model.trim() ? response.model.trim() : model,
      threshold,
      relevantKeys,
      flagged: Boolean(result.flagged),
      categories,
      category_scores: scores,
    },
  };
}
