import assert from 'node:assert/strict';
import { shouldBlurPhoto } from '../lib/gallery-media.js';

assert.equal(
  shouldBlurPhoto({
    originalFilename: 'unclothy-result.png',
    blurOverride: 'auto',
    nsfwDetected: false,
  }),
  false,
);

assert.equal(
  shouldBlurPhoto({
    originalFilename: 'safe-name.png',
    blurOverride: 'auto',
    nsfwDetected: true,
  }),
  true,
);

assert.equal(
  shouldBlurPhoto({
    originalFilename: 'safe-name.png',
    blurOverride: 'force_blur',
    nsfwDetected: false,
  }),
  true,
);

assert.equal(
  shouldBlurPhoto({
    originalFilename: 'flagged.png',
    blurOverride: 'force_unblur',
    nsfwDetected: true,
  }),
  false,
);

console.log('Gallery media blur tests passed.');
