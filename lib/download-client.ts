export type DownloadResult = {
  filename: string;
  includedCount: number;
  skippedCount: number;
};

const parseFilenameFromContentDisposition = (value: string | null) => {
  if (!value) return '';

  const utf8Match = value.match(/filename\*\s*=\s*UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1].replace(/["']/g, ''));
    } catch {
      return utf8Match[1].replace(/["']/g, '');
    }
  }

  const quotedMatch = value.match(/filename\s*=\s*"([^"]+)"/i);
  if (quotedMatch?.[1]) {
    return quotedMatch[1];
  }

  const plainMatch = value.match(/filename\s*=\s*([^;]+)/i);
  return plainMatch?.[1]?.replace(/["']/g, '').trim() || '';
};

const triggerBlobDownload = (blob: Blob, filename: string) => {
  const blobUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = filename;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(blobUrl);
};

export async function downloadFromApi(url: string, fallbackFilename: string): Promise<DownloadResult> {
  const response = await fetch(url, {
    method: 'GET',
    cache: 'no-store',
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.error || 'Download failed.');
  }

  const blob = await response.blob();
  const parsedFilename = parseFilenameFromContentDisposition(response.headers.get('content-disposition'));
  const filename = parsedFilename || fallbackFilename;
  triggerBlobDownload(blob, filename);

  return {
    filename,
    includedCount: Number(response.headers.get('x-download-included-count') || '0') || 0,
    skippedCount: Number(response.headers.get('x-download-skipped-count') || '0') || 0,
  };
}
