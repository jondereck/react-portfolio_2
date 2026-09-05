import { z } from 'zod';

export const VIEWER_MODES = ['focus', 'slideshow', 'split'] as const;
export type ViewerMode = (typeof VIEWER_MODES)[number];

/**
 * Persisted viewer session payload (core + playback fields) as defined in
 * docs/superpowers/specs/2026-09-05-gallery-slideshow-ux-design.md.
 */
export type ViewerSessionPayload = {
  photoIndex: number;
  viewerMode: ViewerMode;
  delayMs: number;
  isPlaying: boolean;
  splitLeftIndex: number | null;
  splitRightIndex: number | null;
};

export type ViewerSession = ViewerSessionPayload & {
  updatedAt: string | null;
};

const nonNegativeInt = z.coerce.number().int().min(0).max(1_000_000);

export const viewerSessionUpsertSchema = z.object({
  photoIndex: nonNegativeInt.default(0),
  viewerMode: z.enum(VIEWER_MODES).default('focus'),
  // Clamp playback delay to sane bounds (0.5s – 5min) to avoid runaway timers.
  delayMs: z.coerce.number().int().min(500).max(300_000).default(5000),
  isPlaying: z.coerce.boolean().default(false),
  splitLeftIndex: nonNegativeInt.nullable().default(null),
  splitRightIndex: nonNegativeInt.nullable().default(null),
});

export type ViewerSessionUpsertInput = z.infer<typeof viewerSessionUpsertSchema>;

/**
 * A session is only worth resuming if the user actually moved past the very
 * first frame or engaged a non-default (slideshow/split) playback mode.
 * A brand-new "never viewed" default state should not trigger the resume prompt.
 */
export function isResumableSession(session: ViewerSession | null | undefined): boolean {
  if (!session) return false;
  if (session.viewerMode === 'slideshow' || session.viewerMode === 'split') return true;
  if (session.photoIndex > 0) return true;
  if ((session.splitLeftIndex ?? 0) > 0) return true;
  if ((session.splitRightIndex ?? 0) > 0) return true;
  return session.isPlaying === true;
}

/** localStorage key for the immediate client-side cache, scoped per user + album. */
export function viewerSessionStorageKey(userId: string, albumId: number | string): string {
  return `gallery:viewer-session:${userId}:${albumId}`;
}
