import { NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import { canMutateContent } from '@/lib/auth/roles';
import { toAuthErrorResponse } from '@/lib/auth/responses';
import { resolveManagedProfileFromRequest } from '@/lib/profile/resolve-profile';
import { isRateLimited } from '@/lib/server/rate-limit';
import { toErrorResponse } from '@/lib/server/api-responses';
import { createFieldErrorResponse, createFormErrorResponse } from '@/lib/server/form-responses';
import { extractCertificateFieldsFromAsset } from '@/lib/server/certificate-extraction';
import { isPdfAssetUrl } from '@/lib/certificates';
import { uploadCertificateAssetFile } from '@/lib/server/uploads';

export const runtime = 'nodejs';

const configureCloudinary = () => {
  const cloudName =
    process.env.CLOUDINARY_NAME ||
    process.env.CLOUDINARY_CLOUD_NAME ||
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_KEY || process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_SECRET || process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    return null;
  }

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
  });

  return { cloudName, apiKey, apiSecret };
};

const isFile = (value: FormDataEntryValue | null): value is File => {
  return typeof File !== 'undefined' && value instanceof File;
};

export async function POST(request: Request) {
  if (await isRateLimited(request, 'admin-mutation', 120, 60_000)) {
    return createFormErrorResponse({ error: 'Too many requests. Try again later.', errorCode: 'RATE_LIMITED' }, 429);
  }

  try {
    const { actor } = await resolveManagedProfileFromRequest(request);
    if (!canMutateContent(actor.user.role)) {
      return createFormErrorResponse({ error: 'You are not allowed to extract certificate data.', errorCode: 'FORBIDDEN' }, 403);
    }

    const formData = await request.formData();
    const assetFile = formData.get('assetFile');

    if (!isFile(assetFile)) {
      return createFieldErrorResponse({ field: 'assetFile', message: 'Choose an image or PDF file to upload.', errorCode: 'FILE_REQUIRED' });
    }

    const uploaded = await uploadCertificateAssetFile(assetFile, 'portfolio/certificates');
    const assetUrl = uploaded.secureUrl;
    const isPdfUpload = assetFile.type === 'application/pdf' || assetFile.name.toLowerCase().endsWith('.pdf') || uploaded.format === 'pdf';
    let extractedFields = {};
    let warnings = [];
    let thumbnailUrl = assetUrl;
    let assetOpenUrl = assetUrl;

    // For PDFs, create a signed delivery URL for page 1 as JPG. This avoids 401/403
    // when Cloudinary "strict transformations" is enabled.
    if (isPdfUpload && uploaded.publicId) {
      const configured = configureCloudinary();
      if (configured) {
        const resourceType = uploaded.resourceType === 'raw' ? 'raw' : 'image';
        assetOpenUrl = cloudinary.url(uploaded.publicId, {
          secure: true,
          sign_url: true,
          resource_type: resourceType,
          format: uploaded.format || 'pdf',
        });

        thumbnailUrl = cloudinary.url(uploaded.publicId, {
          secure: true,
          sign_url: true,
          resource_type: 'image',
          transformation: [{ fetch_format: 'jpg', page: 1, quality: 'auto' }],
        });
      }
    }

    try {
      const extractionResult = await extractCertificateFieldsFromAsset({
        assetUrl: thumbnailUrl,
        filename: assetFile.name,
      });
      extractedFields = extractionResult.extractedFields;
      warnings = extractionResult.warnings;
    } catch (error) {
      warnings = [error instanceof Error ? error.message : 'Certificate details could not be extracted. You can still fill the form manually.'];
    }

    return NextResponse.json({
      assetUrl,
      assetOpenUrl,
      thumbnailUrl,
      assetKind: isPdfAssetUrl(assetUrl) ? 'pdf' : 'image',
      extractedFields,
      warnings,
    });
  } catch (error) {
    const authError = toAuthErrorResponse(error);
    if (authError) {
      return authError;
    }
    return toErrorResponse(error, 'Unable to extract certificate data.');
  }
}
