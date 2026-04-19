export function isPdfAssetUrl(value: unknown): value is string {
  if (typeof value !== 'string') {
    return false;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return false;
  }

  try {
    const parsed = new URL(trimmed);
    const pathname = parsed.pathname.toLowerCase();
    return pathname.endsWith('.pdf') || parsed.searchParams.get('format')?.toLowerCase() === 'pdf';
  } catch {
    return trimmed.toLowerCase().includes('.pdf');
  }
}

function toTimestamp(value: unknown) {
  if (typeof value !== 'string' || !value.trim()) {
    return null;
  }

  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
}

export function compareCertificatesByIssuedAtDesc(left: any, right: any) {
  const leftTimestamp = toTimestamp(left?.issuedAt);
  const rightTimestamp = toTimestamp(right?.issuedAt);

  if (leftTimestamp !== null && rightTimestamp !== null && leftTimestamp !== rightTimestamp) {
    return rightTimestamp - leftTimestamp;
  }

  if (leftTimestamp !== null && rightTimestamp === null) {
    return -1;
  }

  if (leftTimestamp === null && rightTimestamp !== null) {
    return 1;
  }

  const leftOrder = Number.isFinite(Number(left?.sortOrder)) ? Number(left.sortOrder) : Number.MAX_SAFE_INTEGER;
  const rightOrder = Number.isFinite(Number(right?.sortOrder)) ? Number(right.sortOrder) : Number.MAX_SAFE_INTEGER;

  if (leftOrder !== rightOrder) {
    return leftOrder - rightOrder;
  }

  return Number(left?.id ?? 0) - Number(right?.id ?? 0);
}
