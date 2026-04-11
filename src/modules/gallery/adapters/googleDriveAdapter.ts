export type ImportedDrivePhoto = {
  sourceId: string;
  imageUrl: string;
  caption?: string;
  dateTaken?: string;
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
      throw new Error('Failed to load photos from Google Drive folder.');
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
