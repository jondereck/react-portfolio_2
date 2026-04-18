export type ImportedDrivePhoto = {
  sourceId: string;
  imageUrl: string;
  caption?: string;
  dateTaken?: string;
};

type GoogleErrorPayload = {
  error?: {
    code?: number;
    message?: string;
    status?: string;
    errors?: Array<{
      reason?: string;
      message?: string;
    }>;
  };
};

type GoogleFileResponse = {
  id: string;
  name: string;
  mimeType: string;
  imageMediaMetadata?: {
    time?: string;
  };
};

type GoogleFilesListResponse = {
  files?: GoogleFileResponse[];
};

const ALLOWED_MIME_PREFIX = 'image/';

async function createGoogleDriveRequestError(response: Response) {
  const text = await response.text();
  let payload: GoogleErrorPayload | null = null;

  try {
    payload = text ? (JSON.parse(text) as GoogleErrorPayload) : null;
  } catch {
    payload = null;
  }

  const googleMessage = payload?.error?.message?.trim();
  const googleReasons = (payload?.error?.errors ?? []).map((entry) => entry.reason).filter(Boolean);

  if (
    response.status === 403 &&
    (googleReasons.includes('accessNotConfigured') ||
      payload?.error?.status === 'PERMISSION_DENIED' ||
      /Drive API has not been used|SERVICE_DISABLED/i.test(googleMessage ?? ''))
  ) {
    return new Error('Google Drive API is not enabled for this Google Cloud project. Enable the Drive API and try again in a few minutes.');
  }

  if (response.status === 404) {
    return new Error('Google Drive folder not found, or the connected Google account does not have access to it.');
  }

  if (response.status === 403) {
    return new Error('The connected Google account does not have permission to read that Google Drive folder.');
  }

  if (googleMessage) {
    return new Error(`Google Drive error: ${googleMessage}`);
  }

  return new Error('Failed to load photos from Google Drive folder.');
}

export class GoogleDriveAdapter {
  async listFolderImages(args: { accessToken: string; folderId: string; limit: number }): Promise<ImportedDrivePhoto[]> {
    const query = `'${args.folderId}' in parents and trashed = false and mimeType contains 'image/'`;
    const params = new URLSearchParams({
      q: query,
      pageSize: String(args.limit),
      fields: 'files(id,name,mimeType,imageMediaMetadata(time))',
      orderBy: 'createdTime desc',
      supportsAllDrives: 'true',
      includeItemsFromAllDrives: 'true',
    });

    const response = await fetch(`https://www.googleapis.com/drive/v3/files?${params.toString()}`, {
      headers: {
        Authorization: `Bearer ${args.accessToken}`,
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      throw await createGoogleDriveRequestError(response);
    }

    const data = (await response.json()) as GoogleFilesListResponse;
    const files = Array.isArray(data.files) ? data.files : [];

    return files
      .filter((file) => file?.id && typeof file?.mimeType === 'string' && file.mimeType.startsWith(ALLOWED_MIME_PREFIX))
      .map((file) => ({
        sourceId: file.id,
        imageUrl: `https://drive.google.com/thumbnail?id=${encodeURIComponent(file.id)}&sz=w2000`,
        caption: file.name,
        dateTaken: file.imageMediaMetadata?.time,
      }));
  }
}
