export type ImportedDrivePhoto = {
  sourceId: string;
  imageUrl: string;
  caption?: string;
  dateTaken?: string;
};

export type GoogleDriveFolderEntry = {
  id: string;
  name: string;
  parentId: string | null;
  imageCount: number | null;
};

export type GoogleDriveFolderContext = {
  currentFolder: GoogleDriveFolderEntry | null;
  breadcrumbs: Array<{ id: string; name: string }>;
  folders: GoogleDriveFolderEntry[];
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
  parents?: string[];
  imageMediaMetadata?: {
    time?: string;
  };
};

type GoogleFilesListResponse = {
  files?: GoogleFileResponse[];
};

const ALLOWED_MIME_PREFIX = 'image/';
const GOOGLE_FOLDER_MIME_TYPE = 'application/vnd.google-apps.folder';

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
  private async fetchFilesList(args: { accessToken: string; params: URLSearchParams }) {
    const response = await fetch(`https://www.googleapis.com/drive/v3/files?${args.params.toString()}`, {
      headers: {
        Authorization: `Bearer ${args.accessToken}`,
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      throw await createGoogleDriveRequestError(response);
    }

    return (await response.json()) as GoogleFilesListResponse;
  }

  private async getFolderInfo(args: { accessToken: string; folderId: string }): Promise<GoogleDriveFolderEntry> {
    const params = new URLSearchParams({
      fields: 'id,name,mimeType,parents',
      supportsAllDrives: 'true',
    });

    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(args.folderId)}?${params.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${args.accessToken}`,
        },
        cache: 'no-store',
      },
    );

    if (!response.ok) {
      throw await createGoogleDriveRequestError(response);
    }

    const folder = (await response.json()) as GoogleFileResponse;
    if (!folder?.id || folder.mimeType !== GOOGLE_FOLDER_MIME_TYPE) {
      throw new Error('Google Drive folder not found, or the connected Google account does not have access to it.');
    }

    return {
      id: folder.id,
      name: folder.name || 'Untitled folder',
      parentId: Array.isArray(folder.parents) && folder.parents.length > 0 ? folder.parents[0] : null,
      imageCount: null,
    };
  }

  async listFolders(args: { accessToken: string; parentId?: string | null }): Promise<GoogleDriveFolderEntry[]> {
    const parentId = args.parentId || 'root';
    const params = new URLSearchParams({
      q: `'${parentId}' in parents and trashed = false and mimeType = '${GOOGLE_FOLDER_MIME_TYPE}'`,
      pageSize: '100',
      fields: 'files(id,name,mimeType,parents)',
      orderBy: 'name_natural',
      supportsAllDrives: 'true',
      includeItemsFromAllDrives: 'true',
    });

    const data = await this.fetchFilesList({ accessToken: args.accessToken, params });
    const files = Array.isArray(data.files) ? data.files : [];

    return files
      .filter((file) => file?.id && file?.mimeType === GOOGLE_FOLDER_MIME_TYPE)
      .map((file) => ({
        id: file.id,
        name: file.name || 'Untitled folder',
        parentId: Array.isArray(file.parents) && file.parents.length > 0 ? file.parents[0] : null,
        imageCount: null,
      }));
  }

  async getFolderContext(args: { accessToken: string; parentId?: string | null }): Promise<GoogleDriveFolderContext> {
    const breadcrumbs: Array<{ id: string; name: string }> = [{ id: 'root', name: 'My Drive' }];
    let currentFolder: GoogleDriveFolderEntry | null = null;

    if (args.parentId && args.parentId !== 'root') {
      const chain: GoogleDriveFolderEntry[] = [];
      const visited = new Set<string>();
      let cursorId: string | null = args.parentId;

      while (cursorId && cursorId !== 'root' && !visited.has(cursorId)) {
        visited.add(cursorId);
        const folder = await this.getFolderInfo({
          accessToken: args.accessToken,
          folderId: cursorId,
        });
        chain.unshift(folder);
        cursorId = folder.parentId;
      }

      currentFolder = chain[chain.length - 1] ?? null;
      breadcrumbs.push(...chain.map((folder) => ({ id: folder.id, name: folder.name })));
    }

    const folders = await this.listFolders({
      accessToken: args.accessToken,
      parentId: args.parentId,
    });

    return {
      currentFolder,
      breadcrumbs,
      folders,
    };
  }

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

    const data = await this.fetchFilesList({ accessToken: args.accessToken, params });
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
