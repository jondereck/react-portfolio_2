export function normalizeProtectedPath(value, origin) {
  if (!value || typeof value !== 'string') {
    return null;
  }

  try {
    const resolved = value.startsWith('/')
      ? new URL(value, origin || 'http://localhost')
      : origin
        ? new URL(value, origin)
        : null;

    if (!resolved) {
      return null;
    }

    if (origin && resolved.origin !== origin) {
      return null;
    }

    const path = `${resolved.pathname}${resolved.search}${resolved.hash}`;
    if (!path.startsWith('/admin') && !path.startsWith('/gallery')) {
      return null;
    }

    if (resolved.pathname === '/admin/login') {
      return null;
    }

    return path;
  } catch {
    return null;
  }
}
