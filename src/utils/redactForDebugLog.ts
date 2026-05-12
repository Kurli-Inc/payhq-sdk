/**
 * Deep-clone and redact payment- and auth-sensitive fields for opt-in debug logging.
 * Callers must not log raw payment payloads; use this for console output only.
 */

export const DEBUG_LOG_SENSITIVE_KEYS = [
  'cardnumber',
  'card_number',
  'cvv',
  'cvv2',
  'cvc',
  'cid',
  'pan',
  'track1',
  'track2',
  'client_secret',
  'clientsecret',
  'access_token',
  'accesstoken',
  'token',
  'refresh_token',
  'refreshtoken',
  'password',
  'authorization',
].map(k => k.replace(/[^a-z0-9]/g, '').toLowerCase());

export const DEBUG_LOG_SENSITIVE_KEY_PATTERNS: RegExp[] = [/token/i];

const SENSITIVE_KEY = new Set(DEBUG_LOG_SENSITIVE_KEYS);
const SENSITIVE_KEY_PATTERNS = DEBUG_LOG_SENSITIVE_KEY_PATTERNS.map(pattern =>
  pattern.flags.includes('i')
    ? pattern
    : new RegExp(pattern.source, `${pattern.flags}i`)
);

function maskCardLike(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (digits.length < 13 || digits.length > 19) {
    return '[redacted]';
  }
  return `****${digits.slice(-4)}`;
}

/** True if the string is mostly a card-length digit sequence (not e.g. a short amount). */
function looksLikeCardNumberString(value: string): boolean {
  const digits = value.replace(/\D/g, '');
  return digits.length >= 13 && digits.length <= 19;
}

function isSensitiveKey(key: string): boolean {
  const normalizedKey = key.replace(/[^a-z0-9]/g, '').toLowerCase();
  if (
    SENSITIVE_KEY_PATTERNS.some(
      pattern => pattern.test(key) || pattern.test(normalizedKey)
    )
  ) {
    return true;
  }
  return SENSITIVE_KEY.has(normalizedKey);
}

/**
 * Returns a structure safe to serialize for debug logs (no full PAN, CVV, or secrets).
 */
export function redactForDebugLog<T>(value: T): T {
  if (value === null || value === undefined) {
    return value;
  }
  if (typeof value === 'string') {
    return (
      looksLikeCardNumberString(value) ? maskCardLike(value) : value
    ) as T;
  }
  if (typeof value !== 'object') {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(v => redactForDebugLog(v)) as T;
  }
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value)) {
    const keyIsSensitive = isSensitiveKey(k);
    if (v === null || v === undefined) {
      out[k] = v;
      continue;
    }
    if (keyIsSensitive) {
      if (typeof v === 'string') {
        const lk = k.toLowerCase();
        if (lk === 'cardnumber' || lk === 'card_number' || lk === 'pan') {
          out[k] = maskCardLike(v);
        } else {
          out[k] = '[redacted]';
        }
      } else {
        out[k] = '[redacted]';
      }
      continue;
    }
    if (
      typeof v === 'string' &&
      !keyIsSensitive &&
      looksLikeCardNumberString(v)
    ) {
      out[k] = maskCardLike(v);
      continue;
    }
    if (typeof v === 'object') {
      out[k] = redactForDebugLog(v);
    } else {
      out[k] = v;
    }
  }
  return out as T;
}

/**
 * `JSON.stringify(redactForDebugLog(value), null, 2)` in one step.
 */
export function redactForDebugLogJson(
  value: unknown,
  space: number = 2
): string {
  return JSON.stringify(redactForDebugLog(value), null, space);
}

/**
 * Deep-redact API error response bodies before attaching to PayHQError details.
 * Keys normalized like `key.toLowerCase().replace(/[^a-z0-9]/g, '')` so
 * camelCase (e.g. paymentMethod) matches the same entries as snake_case.
 */
export function sanitizeApiErrorResponseDetails(details: unknown): unknown {
  const summarizeObjects = new Set([
    'customer',
    'customers',
    'transaction',
    'transactions',
    'card',
    'payment',
    'paymentmethod',
    'paymentmethods',
  ]);

  const shouldRedactKey = (normalizedKey: string): boolean =>
    SENSITIVE_KEY.has(normalizedKey) ||
    normalizedKey.includes('token') ||
    normalizedKey.includes('pan') ||
    normalizedKey.includes('track');

  const PAN_LIKE_STRING_REGEX = /(?:\d[ -]?){13,19}/;

  const sanitize = (value: unknown): unknown => {
    if (value === null || value === undefined) return value;

    if (
      typeof value === 'string' &&
      PAN_LIKE_STRING_REGEX.test(value) &&
      value.replace(/[^\d]/g, '').length >= 13 &&
      value.replace(/[^\d]/g, '').length <= 19
    ) {
      return '[REDACTED]';
    }

    if (Array.isArray(value)) {
      return value.map(item => sanitize(item));
    }

    if (typeof value !== 'object') {
      return value;
    }

    const sanitized: Record<string, unknown> = {};

    for (const [key, nestedValue] of Object.entries(value)) {
      const normalizedKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');

      if (shouldRedactKey(normalizedKey)) {
        sanitized[key] = '[REDACTED]';
        continue;
      }

      if (
        summarizeObjects.has(normalizedKey) &&
        nestedValue &&
        typeof nestedValue === 'object'
      ) {
        sanitized[key] = '[REDACTED]';
        continue;
      }

      sanitized[key] = sanitize(nestedValue);
    }

    return sanitized;
  };

  return sanitize(details);
}
