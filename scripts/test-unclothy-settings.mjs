import assert from 'node:assert/strict';
import {
  buildUnclothyProviderKeyByUiKey,
  buildUnclothyProviderSettingsPayload,
  sanitizeUnclothyProviderSettings,
} from '../lib/unclothy-settings.js';
import { createUnclothyQueueTask } from '../store/unclothyTasks.js';

const settingsEnums = {
  age: ['18', '25', '35', '45', '60', 'automatic'],
  'ass-size': ['small', 'medium', 'large'],
  'body-type': ['skinny', 'fit', 'curvy', 'muscular'],
  'breasts-size': ['small', 'medium', 'large'],
  'generation-mode': ['naked', 'swimsuit', 'underwear', 'latex', 'bondage'],
  gender: ['male', 'female'],
  penis: ['shaved', 'normal', 'hairy'],
  pussy: ['shaved', 'normal', 'hairy'],
};

const providerKeyByUiKey = buildUnclothyProviderKeyByUiKey(settingsEnums);
assert.equal(providerKeyByUiKey.generationMode, 'generation-mode');
assert.equal(providerKeyByUiKey.bodyType, 'body-type');
assert.equal(providerKeyByUiKey.breastsSize, 'breasts-size');
assert.equal(providerKeyByUiKey.assSize, 'ass-size');

const payload = buildUnclothyProviderSettingsPayload(
  {
    generationMode: 'swimsuit',
    bodyType: 'curvy',
    breastsSize: 'small',
    assSize: 'medium',
    pussy: 'hairy',
    age: '25',
  },
  settingsEnums,
);
assert.deepEqual(payload, {
  'generation-mode': 'swimsuit',
  'body-type': 'curvy',
  'breasts-size': 'small',
  'ass-size': 'medium',
  pussy: 'hairy',
  age: '25',
});

const sanitized = sanitizeUnclothyProviderSettings(payload, settingsEnums);
assert.deepEqual(sanitized.fieldErrors, {});
assert.deepEqual(sanitized.settings, {
  ...payload,
  gender: 'female',
});

const unsupported = sanitizeUnclothyProviderSettings({ unknown: 'x' }, settingsEnums);
assert.ok(unsupported.fieldErrors['settings.unknown']);

const invalidEnum = sanitizeUnclothyProviderSettings({ 'generation-mode': 'formalwear' }, settingsEnums);
assert.ok(invalidEnum.fieldErrors['settings.generation-mode']);

const invalidAge = sanitizeUnclothyProviderSettings({ age: '12' }, settingsEnums);
assert.ok(invalidAge.fieldErrors['settings.age']);

const taskA = createUnclothyQueueTask({ albumId: 1, sourcePhotoId: 2, settingsSnapshot: { 'generation-mode': 'naked' } });
const taskB = createUnclothyQueueTask({ albumId: 1, sourcePhotoId: 2, settingsSnapshot: { 'generation-mode': 'swimsuit' } });
assert.notEqual(taskA.queueTaskId, taskB.queueTaskId);
assert.equal(taskA.albumId, taskB.albumId);
assert.equal(taskA.sourcePhotoId, taskB.sourcePhotoId);
assert.equal(taskA.settingsSnapshot['generation-mode'], 'naked');
assert.equal(taskB.settingsSnapshot['generation-mode'], 'swimsuit');

console.log('Unclothy settings tests passed.');
