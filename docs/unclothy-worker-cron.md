# Unclothy queue processing (Cloudflare Worker cron)

This project queues Unclothy generations in the database, but **processing only advances when the worker endpoint is called**:

- Queue tasks: `POST /api/admin/integrations/unclothy/tasks`
- Process queue (one pass): `GET /api/admin/integrations/unclothy/worker`

If you close the browser / turn off the phone, tasks will **still complete** as long as a server-side cron keeps calling the worker endpoint.

## 1) Production environment requirements

Your deployed Next.js app must have these env vars set (in production, not just in local `.env`):

- `DATABASE_URL`
- `UNCLOTHY_API_BASE_URL`
- `UNCLOTHY_API_KEY`
- `UNCLOTHY_SETTINGS_PATH`
- `CRON_SECRET` (must match what the Cloudflare Worker uses)

## 2) Deploy the Cloudflare scheduled Worker

Worker code lives at `cloudflare/unclothy-cron-worker`.

1. Update the target URL in `cloudflare/unclothy-cron-worker/wrangler.toml`:
   - `TARGET_URL = "https://<YOUR_PROD_DOMAIN>/api/admin/integrations/unclothy/worker"`
2. Set the secret in Cloudflare (recommended):
   - `cd cloudflare/unclothy-cron-worker`
   - `npx wrangler secret put CRON_SECRET`
3. Deploy:
   - `npx wrangler deploy`

The schedule is already configured to run every minute (`* * * * *`).

## 3) Quick verification

### Manual endpoint check

From anywhere (Postman/curl), call:

- `GET https://<YOUR_PROD_DOMAIN>/api/admin/integrations/unclothy/worker`
- Header: `Authorization: Bearer <CRON_SECRET>`

Expected: `200` JSON payload (and non-zero `started`/`advanced` while tasks exist).

### Confirm cron runs even when browser is closed

1. Enqueue a task in the admin UI.
2. Close the browser.
3. Watch Cloudflare Worker logs:
   - `npx wrangler tail unclothy-cron-worker`
4. After a few minutes, reopen admin — the task should move through `processing` → `ingesting` → `done` (or show a clear error).

## Troubleshooting

- `401 Unauthorized`: Cloudflare Worker `CRON_SECRET` does not match the Next.js app `CRON_SECRET`.
- `5xx` / timeouts: production app is down or the URL is wrong (make sure it’s a public domain, not `localhost`).
- No progress: verify the cron is running, and verify the app can reach the database in production (`DATABASE_URL`).

Note: the Worker accepts either `TARGET_URL` or `WORKER_TARGET_URL` as the target endpoint variable (compatibility with older setups).
