import { NextResponse } from 'next/server';
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
    let extractedFields = {};
    let warnings = [];

    try {
      const extractionResult = await extractCertificateFieldsFromAsset({
        assetUrl,
        filename: assetFile.name,
      });
      extractedFields = extractionResult.extractedFields;
      warnings = extractionResult.warnings;
    } catch (error) {
      warnings = [error instanceof Error ? error.message : 'Certificate details could not be extracted. You can still fill the form manually.'];
    }

    return NextResponse.json({
      assetUrl,
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
