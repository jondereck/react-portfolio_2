export function isAuthorizedMutation(request) {
  const adminKey = process.env.ADMIN_API_KEY;

  if (!adminKey) {
    return false;
  }

  const provided = request.headers.get('x-admin-key');
  return provided === adminKey;
}
