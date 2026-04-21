import assert from 'node:assert/strict';
import {
  buildUnclothyProviderKeyByUiKey,
  buildUnclothyProviderSettingsPayload,
  getUnclothyGenerationModeLabel,
  sanitizeUnclothyProviderSettings,
} from '../lib/unclothy-settings.js';
import { createUnclothyQueueTask } from '../store/unclothyTasks.js';

const liveHyphenatedSettingsEnums = {
  age: ['18', '25', '35', '45', '60', 'automatic'],
  'ass-size': ['small', 'medium', 'large'],
  'body-type': ['skinny', 'fit', 'curvy', 'muscular'],
  'breasts-size': ['small', 'medium', 'large'],
  'generation-mode': ['naked', 'swimsuit', 'underwear', 'latex', 'bondage'],
  gender: ['male', 'female'],
  penis: ['shaved', 'normal', 'hairy'],
  pussy: ['shaved', 'normal', 'hairy'],
};

const openApiCamelCaseSettingsEnums = {
  age: ['18', '25', '35', '45', '60', 'automatic'],
  assSize: ['small', 'medium', 'large'],
  bodyType: ['skinny', 'fit', 'curvy', 'muscular'],
  breastsSize: ['small', 'medium', 'large'],
  generationMode: ['naked', 'swimsuit', 'underwear', 'latex', 'bondage'],
  gender: ['male', 'female'],
  penis: ['shaved', 'normal', 'hairy'],
  pussy: ['shaved', 'normal', 'hairy'],
};

const providerKeyByUiKey = buildUnclothyProviderKeyByUiKey(liveHyphenatedSettingsEnums);
assert.equal(providerKeyByUiKey.generationMode, 'generation-mode');
assert.equal(providerKeyByUiKey.bodyType, 'body-type');
assert.equal(providerKeyByUiKey.breastsSize, 'breasts-size');
assert.equal(providerKeyByUiKey.assSize, 'ass-size');

const camelProviderKeyByUiKey = buildUnclothyProviderKeyByUiKey(openApiCamelCaseSettingsEnums);
assert.equal(camelProviderKeyByUiKey.generationMode, 'generationMode');
assert.equal(camelProviderKeyByUiKey.bodyType, 'bodyType');
assert.equal(camelProviderKeyByUiKey.breastsSize, 'breastsSize');
assert.equal(camelProviderKeyByUiKey.assSize, 'assSize');

const settings = {
  generationMode: 'swimsuit',
  bodyType: 'curvy',
  breastsSize: 'small',
  assSize: 'medium',
  pussy: 'hairy',
  age: '25',
};

const payload = buildUnclothyProviderSettingsPayload(settings, liveHyphenatedSettingsEnums);
assert.deepEqual(payload, {
  generationMode: 'swimsuit',
  'generation-mode': 'swimsuit',
  bodyType: 'curvy',
  'body-type': 'curvy',
  breastsSize: 'small',
  'breasts-size': 'small',
  assSize: 'medium',
  'ass-size': 'medium',
  pussy: 'hairy',
  age: '25',
});

const camelPayload = buildUnclothyProviderSettingsPayload(settings, openApiCamelCaseSettingsEnums);
assert.deepEqual(camelPayload, payload);

for (const generationMode of ['swimsuit', 'latex', 'underwear', 'bondage']) {
  const generationPayload = buildUnclothyProviderSettingsPayload(
    {
      ...settings,
      generationMode,
    },
    liveHyphenatedSettingsEnums,
  );

  assert.equal(generationPayload.generationMode, generationMode);
  assert.equal(generationPayload['generation-mode'], generationMode);
}

const sizePayload = buildUnclothyProviderSettingsPayload(
  {
    ...settings,
    breastsSize: 'large',
    assSize: 'small',
  },
  liveHyphenatedSettingsEnums,
);
assert.equal(sizePayload.breastsSize, 'large');
assert.equal(sizePayload['breasts-size'], 'large');
assert.equal(sizePayload.assSize, 'small');
assert.equal(sizePayload['ass-size'], 'small');

const sanitized = sanitizeUnclothyProviderSettings(payload, liveHyphenatedSettingsEnums);
assert.deepEqual(sanitized.fieldErrors, {});
assert.deepEqual(sanitized.settings, {
  ...payload,
  gender: 'female',
});

const unsupported = sanitizeUnclothyProviderSettings({ unknown: 'x' }, liveHyphenatedSettingsEnums);
assert.ok(unsupported.fieldErrors['settings.unknown']);

const invalidEnum = sanitizeUnclothyProviderSettings({ 'generation-mode': 'formalwear' }, liveHyphenatedSettingsEnums);
assert.ok(invalidEnum.fieldErrors['settings.generation-mode']);

const invalidAge = sanitizeUnclothyProviderSettings({ age: '12' }, liveHyphenatedSettingsEnums);
assert.ok(invalidAge.fieldErrors['settings.age']);

const taskA = createUnclothyQueueTask({ albumId: 1, sourcePhotoId: 2, settingsSnapshot: { generationMode: 'naked', 'generation-mode': 'naked' } });
const taskB = createUnclothyQueueTask({ albumId: 1, sourcePhotoId: 2, settingsSnapshot: { generationMode: 'swimsuit', 'generation-mode': 'swimsuit' } });
assert.notEqual(taskA.queueTaskId, taskB.queueTaskId);
assert.equal(taskA.albumId, taskB.albumId);
assert.equal(taskA.sourcePhotoId, taskB.sourcePhotoId);
assert.equal(getUnclothyGenerationModeLabel(taskA.settingsSnapshot), 'naked');
assert.equal(getUnclothyGenerationModeLabel(taskB.settingsSnapshot), 'swimsuit');
assert.equal(taskA.settingsSnapshot['generation-mode'], 'naked');
assert.equal(taskB.settingsSnapshot['generation-mode'], 'swimsuit');

console.log('Unclothy settings tests passed.');
