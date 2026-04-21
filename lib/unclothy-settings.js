export const unclothyDefaultUiSettings = {
  generationMode: 'naked',
  bodyType: 'fit',
  breastsSize: 'large',
  assSize: 'large',
  pussy: 'shaved',
  age: 'automatic',
};

export const unclothyFallbackEnumOptions = {
  generationMode: ['naked', 'swimsuit', 'underwear', 'latex', 'bondage'],
  bodyType: ['skinny', 'fit', 'curvy', 'muscular'],
  breastsSize: ['small', 'medium', 'large'],
  assSize: ['small', 'medium', 'large'],
  pussy: ['shaved', 'normal', 'hairy'],
  age: ['automatic', '18', '25', '35', '45'],
};

export const unclothyUiSettingKeys = Object.keys(unclothyDefaultUiSettings);

const defaultProviderKeyByUiKey = {
  generationMode: 'generation-mode',
  bodyType: 'body-type',
  breastsSize: 'breasts-size',
  assSize: 'ass-size',
  pussy: 'pussy',
  age: 'age',
};

const enumAliases = {
  generationMode: ['generationmode', 'generation-mode'],
  bodyType: ['bodytype', 'body-type'],
  breastsSize: ['breastssize', 'breasts-size', 'breastsize', 'chestsize', 'chest-size'],
  assSize: ['asssize', 'ass-size', 'hipsize', 'hip-size', 'hipssize', 'hips-size', 'buttsize', 'butt-size'],
  pussy: ['pussy'],
  age: ['age'],
};

const providerAliases = new Map([
  ['breastssize', ['breastssize', 'breastsize', 'chestsize']],
  ['breastsize', ['breastsize', 'breastssize', 'chestsize']],
  ['chestsize', ['chestsize', 'breastsize', 'breastssize']],
  ['asssize', ['asssize', 'hipsize', 'hipssize', 'buttsize']],
  ['hipsize', ['hipsize', 'hipssize', 'asssize', 'buttsize']],
  ['hipssize', ['hipssize', 'hipsize', 'asssize', 'buttsize']],
  ['buttsize', ['buttsize', 'asssize', 'hipsize', 'hipssize']],
]);

export function compareUnclothyEnumKey(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

export function normalizeUnclothyEnumOptions(value) {
  if (Array.isArray(value)) {
    return value.map(String).map((option) => option.trim()).filter(Boolean);
  }

  if (value && typeof value === 'object') {
    const candidate = value.options;
    if (Array.isArray(candidate)) {
      return candidate.map(String).map((option) => option.trim()).filter(Boolean);
    }
  }

  return null;
}

export function isAutomaticUnclothyAgeOption(value) {
  if (typeof value !== 'string') return false;
  const normalized = value.trim().toLowerCase();
  return normalized === 'automatic' || normalized === 'auto';
}

export function isExplicitAdultUnclothyAgeOption(value) {
  if (typeof value !== 'string') return false;
  const normalized = value.trim().toLowerCase();
  if (!normalized || isAutomaticUnclothyAgeOption(normalized)) {
    return false;
  }

  const asNumber = Number.parseInt(normalized, 10);
  if (Number.isFinite(asNumber)) {
    return asNumber >= 18;
  }

  return normalized.includes('18') || normalized.includes('adult') || normalized.includes('mature');
}

export function normalizeUnclothySettingsEnums(settingsEnums) {
  const enumOptionsByProviderKey = {};
  const normalizedToProviderKey = new Map();
  const enums = settingsEnums && typeof settingsEnums === 'object' ? settingsEnums : {};

  for (const [providerKey, providerValue] of Object.entries(enums)) {
    const options = normalizeUnclothyEnumOptions(providerValue);
    if (!options || options.length === 0) {
      continue;
    }

    enumOptionsByProviderKey[providerKey] = options;
    const normalizedKey = compareUnclothyEnumKey(providerKey);
    if (normalizedKey && !normalizedToProviderKey.has(normalizedKey)) {
      normalizedToProviderKey.set(normalizedKey, providerKey);
    }
  }

  return { enumOptionsByProviderKey, normalizedToProviderKey };
}

export function buildUnclothyProviderKeyByUiKey(settingsEnums) {
  const { normalizedToProviderKey } = normalizeUnclothySettingsEnums(settingsEnums);
  const result = {};

  for (const uiKey of unclothyUiSettingKeys) {
    const candidates = [compareUnclothyEnumKey(uiKey), ...(enumAliases[uiKey] || [])].filter(Boolean);
    const providerKey = candidates
      .map((candidate) => normalizedToProviderKey.get(compareUnclothyEnumKey(candidate)))
      .find((value) => typeof value === 'string' && value.length > 0);

    result[uiKey] = providerKey || defaultProviderKeyByUiKey[uiKey] || uiKey;
  }

  return result;
}

export function getUnclothyOptionsForUiKey(key, settingsEnums) {
  const { enumOptionsByProviderKey } = normalizeUnclothySettingsEnums(settingsEnums);
  const providerKeyByUiKey = buildUnclothyProviderKeyByUiKey(settingsEnums);
  const providerKey = providerKeyByUiKey[key] || key;
  const fromProvider = enumOptionsByProviderKey[providerKey];

  if (Array.isArray(fromProvider) && fromProvider.length > 0) {
    if (key === 'age') {
      const adultOptions = fromProvider.filter(
        (option) => isAutomaticUnclothyAgeOption(option) || isExplicitAdultUnclothyAgeOption(option),
      );
      return adultOptions.length > 0 ? adultOptions : unclothyFallbackEnumOptions.age;
    }
    return fromProvider;
  }

  if (key === 'age') {
    return unclothyFallbackEnumOptions.age.filter(
      (option) => isAutomaticUnclothyAgeOption(option) || isExplicitAdultUnclothyAgeOption(option),
    );
  }

  return unclothyFallbackEnumOptions[key] || [];
}

export function normalizeUnclothyUiSettings(candidate, settingsEnums) {
  const providerKeyByUiKey = buildUnclothyProviderKeyByUiKey(settingsEnums);
  const source = candidate && typeof candidate === 'object' ? candidate : {};
  const normalized = {
    ...unclothyDefaultUiSettings,
    ...source,
  };

  for (const key of unclothyUiSettingKeys) {
    const providerKey = providerKeyByUiKey[key];
    if (providerKey && source[providerKey] != null && source[key] == null) {
      normalized[key] = source[providerKey];
    }

    const options = getUnclothyOptionsForUiKey(key, settingsEnums);
    const value = String(normalized[key] ?? '').trim();
    if (!value || (options.length > 0 && !options.includes(value))) {
      normalized[key] = options[0] ?? unclothyDefaultUiSettings[key];
    }
  }

  return normalized;
}

function resolveEnumValue(value, options) {
  if (typeof value !== 'string' && typeof value !== 'number' && typeof value !== 'boolean') {
    return null;
  }

  const raw = String(value).trim();
  if (!raw) {
    return null;
  }

  return (
    options.find((option) => option === raw) ||
    options.find((option) => option.toLowerCase() === raw.toLowerCase()) ||
    (isAutomaticUnclothyAgeOption(raw)
      ? options.find((option) => isAutomaticUnclothyAgeOption(option)) || null
      : null)
  );
}

function resolveProviderKey(rawKey, normalizedToProviderKey) {
  const normalizedKey = compareUnclothyEnumKey(rawKey);
  if (!normalizedKey) return null;

  const direct = normalizedToProviderKey.get(normalizedKey);
  if (direct) return direct;

  const uiKey = unclothyUiSettingKeys.find((key) => {
    const candidates = [compareUnclothyEnumKey(key), ...(enumAliases[key] || [])].map(compareUnclothyEnumKey);
    return candidates.includes(normalizedKey);
  });
  if (uiKey) {
    const candidates = [compareUnclothyEnumKey(uiKey), ...(enumAliases[uiKey] || [])];
    const resolved = candidates
      .map((candidate) => normalizedToProviderKey.get(compareUnclothyEnumKey(candidate)))
      .find((value) => typeof value === 'string' && value.length > 0);
    if (resolved) return resolved;
  }

  return (providerAliases.get(normalizedKey) || [])
    .map((candidate) => normalizedToProviderKey.get(candidate))
    .find((value) => typeof value === 'string' && value.length > 0) || null;
}

export function buildUnclothyProviderSettingsPayload(settings, settingsEnums) {
  const providerKeyByUiKey = buildUnclothyProviderKeyByUiKey(settingsEnums);
  const source = settings && typeof settings === 'object' ? settings : {};
  const payload = {};

  for (const key of unclothyUiSettingKeys) {
    const providerKey = providerKeyByUiKey[key] || key;
    const value = source[key] ?? source[providerKey];
    if (value == null) {
      continue;
    }

    const normalizedValue = String(value).trim();
    if (normalizedValue) {
      payload[providerKey] = normalizedValue;
    }
  }

  return payload;
}

export function sanitizeUnclothyProviderSettings(rawSettings, settingsEnums) {
  const { enumOptionsByProviderKey, normalizedToProviderKey } = normalizeUnclothySettingsEnums(settingsEnums);
  const source = rawSettings && typeof rawSettings === 'object' ? rawSettings : {};
  const sanitizedSettings = {};
  const fieldErrors = {};

  for (const [rawKey, rawValue] of Object.entries(source)) {
    const providerKey = resolveProviderKey(rawKey, normalizedToProviderKey);
    if (!providerKey) {
      fieldErrors[`settings.${rawKey}`] = ['Unsupported Unclothy setting for the current provider settings.'];
      continue;
    }

    if (compareUnclothyEnumKey(rawKey) === 'penis' || compareUnclothyEnumKey(providerKey) === 'penis') {
      fieldErrors[`settings.${rawKey}`] = ['Unsupported Unclothy setting for this workflow.'];
      continue;
    }

    const options = enumOptionsByProviderKey[providerKey] || [];
    const resolved = resolveEnumValue(rawValue, options);
    if (!resolved) {
      fieldErrors[`settings.${rawKey}`] = [
        options.length > 0 ? `Must be one of: ${options.join(', ')}.` : 'Invalid value.',
      ];
      continue;
    }

    sanitizedSettings[providerKey] = resolved;
  }

  const ageProviderKey = normalizedToProviderKey.get(compareUnclothyEnumKey('age')) || 'age';
  const requestedAge = sanitizedSettings[ageProviderKey];
  const normalizedRequestedAge = typeof requestedAge === 'string' ? requestedAge.trim() : '';

  if (
    normalizedRequestedAge &&
    !isAutomaticUnclothyAgeOption(normalizedRequestedAge) &&
    !isExplicitAdultUnclothyAgeOption(normalizedRequestedAge)
  ) {
    fieldErrors.settings = ['Age must be "automatic" or an explicit adult (18+) option.'];
  }

  if (!normalizedRequestedAge) {
    const ageOptions = enumOptionsByProviderKey[ageProviderKey] || [];
    const automatic = ageOptions.find((option) => isAutomaticUnclothyAgeOption(option));
    const adult =
      ageOptions.find((option) => isExplicitAdultUnclothyAgeOption(option)) ||
      ageOptions.find((option) => option.toLowerCase().includes('18'));
    sanitizedSettings[ageProviderKey] = automatic || adult || '18';
  }

  sanitizedSettings.gender = 'female';

  return {
    settings: sanitizedSettings,
    fieldErrors,
  };
}
