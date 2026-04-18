import { createHash } from 'node:crypto';

export type ImportedDrivePhoto = {
  sourceId: string;
  imageUrl: string;
  caption?: string;
  dateTaken?: string;
  mimeType?: string;
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
  files: GoogleDriveMediaPreviewEntry[];
  nextPreviewPageToken: string | null;
};

export type GoogleDriveMediaPreviewEntry = {
  id: string;
  name: string;
  mimeType: string;
  previewUrl: string;
  kind: 'image' | 'video';
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
  createdTime?: string;
};

type GoogleFilesListResponse = {
  files?: GoogleFileResponse[];
  nextPageToken?: string;
};

const ALLOWED_MEDIA_MIME_PREFIXES = ['image/', 'video/'];
const PREVIEW_MIME_PREFIXES = ['image/', 'video/'];
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

  async listFolderPreviewFiles(args: {
    accessToken: string;
    parentId?: string | null;
    limit?: number;
    pageToken?: string | null;
  }): Promise<{ files: GoogleDriveMediaPreviewEntry[]; nextPageToken: string | null }> {
    const parentId = args.parentId || 'root';
    const previewLimit = Math.max(1, Math.min(24, args.limit ?? 8));
    const params = new URLSearchParams({
      q: `'${parentId}' in parents and trashed = false and (mimeType contains 'image/' or mimeType contains 'video/')`,
      pageSize: String(previewLimit),
      fields: 'files(id,name,mimeType)',
      orderBy: 'createdTime desc',
      supportsAllDrives: 'true',
      includeItemsFromAllDrives: 'true',
    });

    if (args.pageToken) {
      params.set('pageToken', args.pageToken);
    }

    const data = await this.fetchFilesList({ accessToken: args.accessToken, params });
    const files = Array.isArray(data.files) ? data.files : [];

    return {
      files: files
        .filter((file) => file?.id && typeof file?.mimeType === 'string' && PREVIEW_MIME_PREFIXES.some((prefix) => file.mimeType.startsWith(prefix)))
        .map((file) => ({
          id: file.id,
          name: file.name || 'Untitled media',
          mimeType: file.mimeType,
          previewUrl: `/api/admin/integrations/google-drive/files/${encodeURIComponent(file.id)}`,
          kind: file.mimeType.startsWith('video/') ? 'video' : 'image',
        })),
      nextPageToken: data.nextPageToken || null,
    };
  }

  async getFolderContext(args: {
    accessToken: string;
    parentId?: string | null;
    previewPageToken?: string | null;
    previewLimit?: number;
  }): Promise<GoogleDriveFolderContext> {
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
    const preview = await this.listFolderPreviewFiles({
      accessToken: args.accessToken,
      parentId: args.parentId,
      limit: args.previewLimit,
      pageToken: args.previewPageToken,
    });

    return {
      currentFolder,
      breadcrumbs,
      folders,
      files: preview.files,
      nextPreviewPageToken: preview.nextPageToken,
    };
  }

  async listFolderMedia(args: { accessToken: string; folderId: string; limit: number }): Promise<ImportedDrivePhoto[]> {
    const query = `'${args.folderId}' in parents and trashed = false and (mimeType contains 'image/' or mimeType contains 'video/')`;
    const params = new URLSearchParams({
      q: query,
      pageSize: String(args.limit),
      fields: 'files(id,name,mimeType,imageMediaMetadata(time),createdTime)',
      orderBy: 'createdTime desc',
      supportsAllDrives: 'true',
      includeItemsFromAllDrives: 'true',
    });

    const data = await this.fetchFilesList({ accessToken: args.accessToken, params });
    const files = Array.isArray(data.files) ? data.files : [];

    return files
      .filter(
        (file) =>
          file?.id &&
          typeof file?.mimeType === 'string' &&
          ALLOWED_MEDIA_MIME_PREFIXES.some((prefix) => file.mimeType.startsWith(prefix)),
      )
      .map((file) => ({
        sourceId: file.id,
        imageUrl: `https://drive.google.com/thumbnail?id=${encodeURIComponent(file.id)}&sz=w2000`,
        caption: file.name,
        dateTaken: file.imageMediaMetadata?.time || file.createdTime,
        mimeType: file.mimeType,
      }));
  }

  async getFileContentHash(args: { accessToken: string; fileId: string }): Promise<string> {
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(args.fileId)}?alt=media&supportsAllDrives=true`,
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

    if (!response.body) {
      throw new Error('Failed to load file content from Google Drive.');
    }

    const reader = response.body.getReader();
    const hash = createHash('sha256');

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }
        hash.update(value);
      }
    } finally {
      reader.releaseLock();
    }

    return hash.digest('hex');
  }
}
