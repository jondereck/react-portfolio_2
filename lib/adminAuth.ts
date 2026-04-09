const ADMIN_HEADER = 'x-admin-key';

export function isAuthorizedMutation(request: Request): boolean {
  const adminKey = process.env.ADMIN_API_KEY;
  if (!adminKey) {
    return false;
  }

  const providedKey = request.headers.get(ADMIN_HEADER);
  return providedKey === adminKey;
}

export function isAdmin(): boolean {
  return Boolean(process.env.ADMIN_API_KEY);
}
