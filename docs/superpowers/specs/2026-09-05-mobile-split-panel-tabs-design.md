# Mobile Split Panel Tabs + Mode Switch

**Date:** 2026-09-05  
**Status:** Approved (Approach 1)  
**Surface:** `app/gallery/[slug]/page.jsx`

## Problem

1. Mobile split controls show both Left and Right control rows with no clear active-panel tabs.
2. In split mode the Mode `<select>` is `hidden md:flex`, so mobile users cannot leave Split for Focus/Slideshow.

## Decision

- Mobile (!hideUI, split): single control strip with **Top / Bottom** tabs mapped through `isSplitMobileSwapped` to left/right panel IDs.
- One Prev/Next/Play/Mute/Loop/Timer set drives `activeSplitPanel`.
- Mode select always visible on mobile in split.
- Desktop: keep dual Left/Right columns + center Mode.
- Tap on a panel still sets `activeSplitPanel` (existing green border).

## Non-goals

- Full Scene Manager chrome redesign.
- Changing desktop split layout.
