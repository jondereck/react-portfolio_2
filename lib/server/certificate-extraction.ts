import OpenAI from 'openai';
import { zodTextFormat } from 'openai/helpers/zod';
import { z } from 'zod';
import { isPdfAssetUrl } from '@/lib/certificates';
import { isSafeHttpUrl } from '@/lib/url-safety';
import { RequestValidationError } from '@/lib/server/uploads';

const certificateExtractionSchema = z.object({
  title: z.string().nullable(),
  issuer: z.string().nullable(),
  category: z.string().nullable(),
  issuedAt: z.string().nullable(),
  expiresAt: z.string().nullable(),
  credentialId: z.string().nullable(),
  link: z.string().nullable(),
});

const certificateExtractionPrompt = [
  'Extract certificate metadata from the provided certificate image or PDF.',
  'Return only fields you can infer directly from the document or an explicit verification URL shown in the document.',
  'Do not hallucinate or invent values.',
  'Use null when a value is missing or uncertain.',
  'For title, use the certificate/course/program name.',
  'For issuer, use the organization that issued the certificate.',
  'For category, use a short category like Frontend, Backend, Cloud, Data, Design, Security, or similar only if the document clearly suggests one.',
  'For issuedAt and expiresAt, return YYYY-MM-DD only when the exact day is present on the document; otherwise return null.',
  'For credentialId, return the visible credential or certificate identifier.',
  'For link, return a visible public verification URL from the document; if none is shown, return null.',
].join(' ');

const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

function normalizeOptionalText(value: string | null | undefined) {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed || undefined;
}

function normalizeDateString(value: string | null | undefined) {
  const normalized = normalizeOptionalText(value);
  if (!normalized) {
    return undefined;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    return undefined;
  }

  const timestamp = Date.parse(`${normalized}T00:00:00.000Z`);
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : undefined;
}

export async function extractCertificateFieldsFromAsset(options: { assetUrl: string; filename: string }) {
  if (!openai) {
    throw new RequestValidationError(
      'Certificate extraction is not configured. Set OPENAI_API_KEY.',
      500,
      undefined,
      'OPENAI_NOT_CONFIGURED',
    );
  }

  const assetInput = isPdfAssetUrl(options.assetUrl)
    ? {
        type: 'input_file',
        file_url: options.assetUrl,
        filename: options.filename || 'certificate.pdf',
      }
    : {
        type: 'input_image',
        image_url: options.assetUrl,
        detail: 'high',
      };

  const response = await openai.responses.parse({
    model: process.env.OPENAI_CERTIFICATE_EXTRACTION_MODEL || 'gpt-4o-mini',
    input: [
      {
        role: 'user',
        content: [
          {
            type: 'input_text',
            text: `${certificateExtractionPrompt} Filename: ${options.filename || 'unknown'}.`,
          },
          assetInput as any,
        ],
      },
    ],
    text: {
      format: zodTextFormat(certificateExtractionSchema, 'certificate_extraction'),
    },
  });

  const parsed = response.output_parsed;
  if (!parsed) {
    throw new RequestValidationError('Certificate extraction failed.', 502, undefined, 'CERTIFICATE_EXTRACTION_FAILED');
  }

  const extractedFields = {
    title: normalizeOptionalText(parsed.title),
    issuer: normalizeOptionalText(parsed.issuer),
    category: normalizeOptionalText(parsed.category),
    issuedAt: normalizeDateString(parsed.issuedAt),
    expiresAt: normalizeDateString(parsed.expiresAt),
    credentialId: normalizeOptionalText(parsed.credentialId),
    link: isSafeHttpUrl(parsed.link) ? parsed.link.trim() : undefined,
  };

  const warnings = [];

  if (!extractedFields.title) {
    warnings.push('Certificate title could not be extracted confidently.');
  }
  if (!extractedFields.issuer) {
    warnings.push('Certificate issuer could not be extracted confidently.');
  }
  if (!extractedFields.category) {
    warnings.push('Certificate category could not be extracted confidently.');
  }
  if (!extractedFields.link) {
    warnings.push('No verification URL was found in the document. The uploaded asset URL will be used as the reference link.');
  }

  return { extractedFields, warnings };
}
