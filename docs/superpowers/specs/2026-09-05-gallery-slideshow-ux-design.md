# Gallery Slideshow UX Design

**Date:** 2026-09-05  
**Status:** Approved in brainstorming (approach 1 + sections)  
**Primary surface:** `app/gallery/[slug]/page.jsx`  
**Audience:** Signed-in gallery users (`ADMIN_ROLES` via `app/gallery/layout.jsx`)

## Problem

The album viewer already supports focus / slideshow / split modes, browser fullscreen (`hideUI`), swipe-to-hide controls, pinch zoom, and wheel zoom in some paths — but several behaviors are incomplete or inconsistent:

1. No **F** shortcut for fullscreen when the slideshow/viewer is open.
2. Last position and playback settings are not restored across devices; only `viewerMode` and mobile swap are in `localStorage`.
3. In split fullscreen, bottom controls always drive the **right** panel; there is no active-panel focus or left/right (top/bottom) hint.
4. No double-tap zoom on mobile; wheel zoom is incomplete relative to fullscreen surfaces.
5. No **H** shortcut to hide/show fullscreen controls.
6. Mobile split controls include a **swap** button that is hidden on PC (`md:hidden`).

## Goals

- Keyboard: **F** enters fullscreen hide-UI; **H** toggles control chrome while fullscreen.
- Persist and sync **core + playback** session per user+album; prompt **Continue where you left off?** on album visit.
- Split fullscreen: active panel follows click/hover; bottom bar controls that panel; visible region hint while pointer moves.
- Zoom: double-tap (mobile) and wheel (desktop) on the active image surface.
- Control parity: swap + the same control set on PC and mobile.

## Non-goals

- Guest / share-link cross-device sync (album pages require signed-in admin roles).
- Persisting mute/loop/filter or unrelated gallery grid density.
- Rewriting the entire viewer into multiple packages (only extract helpers if the page edit becomes unsafe).
- Changing admin CMS media viewer (`modules/gallery/admin/GalleryMediaViewer.jsx`).

## Decisions (locked)

| Topic | Choice |
| --- | --- |
| Resume prompt timing | Once when opening `/gallery/[slug]` if a saved session exists |
| Cross-device | Signed-in account only (server + local cache) |
| Session payload | Index, mode, delay, playing, split left/right indices |
| Persistence approach | localStorage immediate + debounced server PUT |
| Split targeting | Click/hover sets `activeSplitPanel`; controls drive that panel |
| F key | Enter fullscreen / hide-UI (same path as existing fullscreen action) |
| H key | Toggle `fullscreenControlsHidden` when hide-UI + slideshow/split |

---

## Section 1 — Resume session (cross-device)

### Data model

New Prisma model (name may be `GalleryViewerSession`):

- `id` (cuid)
- `userId` → `User`
- `albumId` → `Album`
- `photoIndex` Int
- `viewerMode` String (`focus` | `slideshow` | `split`)
- `delayMs` Int
- `isPlaying` Boolean
- `splitLeftIndex` Int?
- `splitRightIndex` Int?
- `updatedAt` DateTime
- Unique constraint: `(userId, albumId)`

### API

- `GET /api/gallery/albums/[id]/viewer-session` → session or `null`
- `PUT /api/gallery/albums/[id]/viewer-session` → upsert body (core + playback fields)
- `DELETE /api/gallery/albums/[id]/viewer-session` → clear (Start fresh)

Auth: same gallery/admin session as other gallery APIs. Reject if user cannot access the album.

### Client flow

1. While the viewer is open, on changes to payload fields: write `localStorage` key scoped by `userId`+`albumId` immediately; debounce PUT (~800ms).
2. On album page load (after album is known): GET server session (prefer server over stale local if both exist and server is newer).
3. If a meaningful session exists (not empty / not unused “never viewed”), show prompt:
   - **Continue where you left off?**
   - **Start fresh**
4. Continue → `openViewerAt` with saved mode/index; restore delay, playing, split indices.
5. Start fresh → DELETE server + clear local; stay on grid.
6. Closing the viewer does **not** clear the session (so another device can resume).

### Prompt UX

- Lightweight overlay or dialog near album header after photos load.
- Shown at most once per page visit (dismiss stores an in-memory “handled” flag).
- If user opens a specific photo from the grid before answering, treat that as Start fresh for this visit (optional: still keep server session unless they explicitly Start fresh — **prefer:** opening a photo suppresses the prompt for this visit but does not delete the saved session).

---

## Section 2 — Shortcuts, split focus, zoom, controls

### Shortcuts

When `viewerOpen`:

| Key | Behavior |
| --- | --- |
| `F` / `f` | Call existing `handleHideUI()` (enter browser fullscreen + hide chrome). Ignore if typing in an input/select. |
| `H` / `h` | If `hideUI` and mode is `slideshow` or `split`, toggle `fullscreenControlsHidden`. |
| Escape / arrows / Space | Unchanged |

### Split active panel

- State: `activeSplitPanel`: `'left' | 'right'`, default **`left`** (matches existing fullscreen swipe that advances the left panel). Mobile stacked labels map through `isSplitMobileSwapped` (top/bottom).
- Pointer enter / click on a panel sets active panel.
- Fullscreen bottom controls call `moveSplitPanel(activeSplitPanel, …)` and mutate `splitPanels[activeSplitPanel]` for play/mute/loop.
- Visual hint while pointer is moving over the stage:
  - Soft rim / edge highlight on the active region.
  - Short label: “Left” / “Right” on desktop; “Top” / “Bottom” on mobile stacked layout (respect swap).
  - Fade out after ~800ms idle.

### Zoom

- **Mobile:** double-tap on image (non-video) toggles zoom (~2×) centered on tap; if already zoomed, reset to 1×. Pinch-zoom remains. Do not conflict with swipe navigation (require small movement + short interval).
- **Desktop:** `wheel` on the active image surface adjusts scale (including fullscreen); pan with pointer drag when `scale > 1`.
- Split mode: zoom applies to the panel under the pointer / active panel.

### Controls parity

- Show swap (`ArrowUpDown`) on **desktop and mobile** in split fullscreen control bar (remove `md:hidden`).
- Same actions on both: prev/next (active panel), swap, play, mute, loop, exit hide-UI.
- Non-fullscreen chrome already has mode selects; no requirement to duplicate swap there unless split layout is visible — swap only matters for stacked/split orientation in fullscreen and mobile split.

---

## Architecture

```
User (signed-in)
  └─ app/gallery/[slug]/page.jsx  (viewer UX: keys, zoom, split focus, prompt)
        ├─ localStorage cache (immediate)
        └─ GET/PUT/DELETE /api/gallery/albums/[id]/viewer-session
              └─ Prisma GalleryViewerSession (userId + albumId)
```

### Files (expected)

| File | Role |
| --- | --- |
| `prisma/schema.prisma` | Add `GalleryViewerSession` |
| `app/api/gallery/albums/[id]/viewer-session/route.ts` | GET/PUT/DELETE |
| `lib/gallery/viewer-session.ts` (or similar) | Shared types + validation + storage key helpers |
| `app/gallery/[slug]/page.jsx` | Prompt, sync effects, F/H, active panel, zoom, control parity |

### Error handling

- Failed PUT: keep local cache; optional quiet retry once; do not toast-spam.
- Failed GET: fall back to localStorage; if neither, no prompt.
- Invalid indices after album edits: clamp to available filtered list or reset that panel to 0.

### Testing

- Manual: open album on device A in slideshow mid-album → open same album on device B → Continue restores mode/index/timer/playing/split indices.
- Manual: F enters fullscreen; H hides/shows controls; Escape still exits hide-UI then closes.
- Manual: split — hover/click left vs right changes which side bottom controls advance; hint visible while moving.
- Manual: mobile double-tap zoom; desktop wheel zoom; swap visible on desktop width.

## Success criteria

1. F enters fullscreen hide-UI while viewer is open.
2. Resume prompt appears on album visit when a server (or fallback local) session exists for the signed-in user; Continue restores core+playback; Start fresh clears it.
3. Split fullscreen bottom controls drive the active panel; moving pointer shows left/right or top/bottom hint.
4. Double-tap zooms on mobile; wheel zooms on PC.
5. H toggles control visibility in fullscreen slideshow/split.
6. Swap control appears on PC and mobile split fullscreen controls.

## Spec self-review

- No unresolved placeholders (`TBD` / `TODO` in required behavior).
- No contradiction: Start fresh clears; Continue restores; close viewer keeps session.
- Scope limited to public gallery slug viewer + one API/model; admin CMS viewer out of scope.
- Ambiguity resolved: opening a grid photo suppresses prompt for the visit without deleting server session unless Start fresh.
