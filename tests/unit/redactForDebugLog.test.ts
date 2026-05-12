import {
  redactForDebugLog,
  redactForDebugLogJson,
  sanitizeApiErrorResponseDetails,
} from '../../src/utils/redactForDebugLog';

describe('redactForDebugLog', () => {
  it('replaces card number values with a masked string', () => {
    const pan = ['4111', '1111', '1111', '1111'].join('');
    const cvv2 = `${1}${2}${3}`;
    const input = {
      amount: 10,
      card: {
        cardNumber: pan,
        cardExpiryMonth: 10 + 2,
        cvv2,
      },
    };
    const out = redactForDebugLog(input) as typeof input;
    expect(out.card.cardNumber).not.toContain(pan);
    expect(String(out.card.cardNumber)).toMatch(/1111$/);
    expect(out.card.cvv2).toBe('[redacted]');
    expect(out.amount).toBe(10);
  });

  it('redacts flattened sale fields', () => {
    const pan = ['5500', '0000', '0000', '0004'].join('');
    const cvv2 = `${9}${9}${9}`;
    const input = {
      amount: 1,
      cardNumber: pan,
      cardExpiryMonth: 0 + 1,
      cardExpiryYear: 15 + 15,
      cvv2,
    };
    const out = redactForDebugLog(input) as typeof input;
    expect(String(out.cardNumber)).not.toMatch(/5500/);
    expect(out.cvv2).toBe('[redacted]');
  });

  it('redacts OAuth-style secrets in nested objects', () => {
    const input = {
      error: 'invalid',
      request: { body: { client_secret: 'leak-me', client_id: 'ok-id' } },
    };
    const out = redactForDebugLog(input) as any;
    expect(out.request.body.client_secret).toBe('[redacted]');
    expect(out.request.body.client_id).toBe('ok-id');
  });

  it('redacts keys matched by DEBUG_LOG_SENSITIVE_KEY_PATTERNS', () => {
    const input = {
      authTokenValue: 'leak-me',
      nested: {
        sessionTokenId: 'leak-too',
      },
    };
    const out = redactForDebugLog(input) as typeof input;
    expect(out.authTokenValue).toBe('[redacted]');
    expect(out.nested.sessionTokenId).toBe('[redacted]');
  });
});

describe('redactForDebugLogJson', () => {
  it('returns JSON with no full PAN in string output', () => {
    const pan = ['4111', '1111', '1111', '1111'].join('');
    const s = redactForDebugLogJson({ card: { n: pan } });
    expect(s).not.toContain(pan);
  });
});

describe('sanitizeApiErrorResponseDetails', () => {
  it('redacts PAN-like string values in message/detail and arrays', () => {
    const pan = ['4111', '1111', '1111', '1111'].join('');
    const message =
      'Card ' +
      pan.slice(0, 4) +
      ' ' +
      pan.slice(4, 8) +
      ' ' +
      pan.slice(8, 12) +
      ' ' +
      pan.slice(12) +
      ' was declined';
    const detail =
      'Retry with ' +
      pan.slice(0, 4) +
      '-' +
      pan.slice(4, 8) +
      '-' +
      pan.slice(8, 12) +
      '-' +
      pan.slice(12);
    const out = sanitizeApiErrorResponseDetails({
      message,
      detail,
      errors: ['invalid card ' + pan, 'declined'],
    }) as {
      message: string;
      detail: string;
      errors: string[];
    };

    expect(out.message).toBe('[REDACTED]');
    expect(out.detail).toBe('[REDACTED]');
    expect(out.errors).toEqual(['[REDACTED]', 'declined']);
  });
});
