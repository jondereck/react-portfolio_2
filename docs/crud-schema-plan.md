# CRUD Schema Upgrade Plan

This project already supports API CRUD for `skills`, `experience`, `certificates`, plus API routes for `portfolio` and `site-content`. The schema was missing first-class models for `portfolio` and `site-content`, and existing models had limited lifecycle fields.

## What was added to `prisma/schema.prisma`

### 1. Lifecycle + ordering fields on existing models
- `isPublished` for soft visibility control.
- `sortOrder` for deterministic rendering order.
- Optional metadata fields for richer editing:
  - `Skill.description`
  - `Experience.location`, `Experience.employmentType`, `Experience.isCurrent`
  - `Certificate.issuedAt`, `Certificate.expiresAt`, `Certificate.credentialId`

### 2. Full `Portfolio` model
Added a dedicated `Portfolio` model aligned with your existing `app/api/portfolio/route.ts` validator shape:
- content fields: `title`, `description`, `link`, `image`, `badge`
- structure fields: `slug` (unique), `tech` (JSON array), `sortOrder`
- publishing fields: `isFeatured`, `isPublished`

### 3. Full `SiteContent` model
Added single-record content container (`id = 1`) to support update workflows for hero/about and future sections:
- `hero` (JSON)
- `about` (JSON)
- optional `contact` and `seo` JSON fields

### 4. Query-performance indexes
Added indexes for common admin/public filters:
- category + order
- published status
- featured status

## Why this helps complete CRUD

With these models, every major editable website section has a formal schema representation:
- Skills ✅
- Experience ✅
- Certificates ✅
- Portfolio ✅
- Site content blocks (Hero/About/etc.) ✅

This gives you a consistent path to implement full Create/Read/Update/Delete (and publish/unpublish) across all editable content.

## Next implementation steps (recommended)

1. Update `lib/prisma.ts` to include `portfolio` and `siteContent` handlers (currently only skill/experience/certificate are implemented).
2. Extend `lib/validators.ts` with optional fields introduced above (`sortOrder`, `isPublished`, etc.).
3. Add admin UI sections for portfolio + site content in `app/admin/page.jsx`.
4. Add route-level filtering (e.g., public GET returns only `isPublished: true`).
5. Add server-side slug generation/validation for portfolio to avoid collisions.

## Migration notes

- Attempted `npx prisma generate`; this environment blocked npm registry access (HTTP 403).
- Did **not** run `prisma db push` in this change.
