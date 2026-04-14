export class ApiFormError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = 'ApiFormError';
    this.status = options.status;
    this.errorCode = options.errorCode;
    this.fieldErrors = options.fieldErrors || {};
    this.details = options.details || {};
  }
}

const toFieldErrors = (value) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  return Object.entries(value).reduce((accumulator, [key, messages]) => {
    if (Array.isArray(messages)) {
      const normalized = messages.map((message) => String(message)).filter(Boolean);
      if (normalized.length > 0) {
        accumulator[key] = normalized;
      }
    }
    return accumulator;
  }, {});
};

export async function parseErrorResponse(response, fallbackMessage = 'Something went wrong') {
  const data = await response.json().catch(() => ({}));
  const fieldErrors = toFieldErrors(data?.fieldErrors);
  const message =
    typeof data?.error === 'string'
      ? data.error
      : typeof data?.message === 'string'
        ? data.message
        : Object.values(fieldErrors)[0]?.[0] || fallbackMessage;

  return new ApiFormError(message, {
    status: response.status,
    errorCode: typeof data?.errorCode === 'string' ? data.errorCode : undefined,
    fieldErrors,
    details: data?.details && typeof data.details === 'object' && !Array.isArray(data.details) ? data.details : {},
  });
}

export function normalizeFormError(error, fallbackMessage = 'Something went wrong') {
  if (error instanceof ApiFormError) {
    return {
      formError: error.message,
      errorCode: error.errorCode || '',
      fieldErrors: error.fieldErrors || {},
      details: error.details || {},
    };
  }

  return {
    formError: error instanceof Error ? error.message : fallbackMessage,
    errorCode: '',
    fieldErrors: {},
    details: {},
  };
}

export function getFieldError(fieldErrors, key) {
  const messages = fieldErrors?.[key];
  return Array.isArray(messages) && messages.length > 0 ? messages[0] : '';
}

export function clearFieldErrors(fieldErrors, key) {
  if (!fieldErrors || typeof fieldErrors !== 'object') {
    return {};
  }

  return Object.entries(fieldErrors).reduce((accumulator, [currentKey, messages]) => {
    if (currentKey === key || currentKey.startsWith(`${key}.`) || currentKey.startsWith(`${key}[`)) {
      return accumulator;
    }

    accumulator[currentKey] = messages;
    return accumulator;
  }, {});
}

export function collectErrorMessages(formError, fieldErrors) {
  const messages = [];

  if (formError) {
    messages.push(formError);
  }

  for (const entries of Object.values(fieldErrors || {})) {
    if (!Array.isArray(entries)) {
      continue;
    }

    for (const message of entries) {
      if (message && !messages.includes(message)) {
        messages.push(message);
      }
    }
  }

  return messages;
}
