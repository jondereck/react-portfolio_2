# Fullscreen split mini music player

## Goal
Expose album background music controls in fullscreen split mode without the full track-list panel.

## Design
- Show a `Music2` toggle in the fullscreen split bottom bar when the album has audio tracks.
- Tapping the icon opens a floating chip centered above the bar with Play/Pause and Next only.
- Emerald active styling when the player is open or audio is playing; pulse dot while playing.
- Hide icon and chip when fullscreen controls are hidden.
- Reuse existing audio state and handlers (`audioPlayerOpen`, `handleAudioTogglePlay`, `handleAudioNext`).

## Out of scope
- Prev, loop, and track list in fullscreen split
- Changing non-fullscreen audio player behavior
