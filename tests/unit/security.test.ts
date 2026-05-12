/**
 * Security and DX hygiene tests:
 *  - HttpClient must NOT attach the full request body to thrown errors
 *    (payment payloads include card data / tokens).
 *  - PayHQSDK must NOT emit console.warn unless config.debug is true.
 */

import { HttpClient } from '../../src/utils/apiClient';
import { PayHQSDK } from '../../src/PayHQSDK';

describe('HttpClient error redaction', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('does not include the request body on thrown HTTP errors', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 400,
      statusText: 'Bad Request',
      headers: { get: () => 'application/json' },
      json: () => Promise.resolve({ error: 'bad' }),
      text: () => Promise.resolve(''),
    }) as unknown as typeof fetch;

    const client = new HttpClient({
      baseURL: 'https://gateway.example.com',
      timeout: 30000,
      headers: { 'Content-Type': 'application/json' },
      transformRequest: false,
      transformResponse: false,
    });

    const sensitivePayload = {
      card_number: '4111111111111111',
      cvv2: '123',
    };

    let thrown: any;
    try {
      await client.post('/charge', sensitivePayload);
    } catch (e) {
      thrown = e;
    }

    expect(thrown).toBeDefined();
    const serialized = JSON.stringify(thrown.request ?? {});
    expect(serialized).not.toContain('4111111111111111');
    expect(serialized).not.toContain('"123"');
    expect(thrown.request?.body).toBeUndefined();
  });

  it('redacts sensitive response data before attaching it to thrown errors', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 402,
      statusText: 'Payment Required',
      headers: new Headers({ 'content-type': 'application/json' }),
      json: () =>
        Promise.resolve({
          pan: '4111111111111111',
          cvv: '321',
          token: 'tok_live_sensitive_value',
          nested: { card_number: '4111111111111111', cvv2: '999' },
          safeMessage: 'declined',
        }),
      text: () => Promise.resolve(''),
    }) as unknown as typeof fetch;

    const client = new HttpClient({
      baseURL: 'https://gateway.example.com',
      timeout: 30000,
      headers: { 'Content-Type': 'application/json' },
      transformRequest: false,
      transformResponse: false,
    });

    let thrown: any;
    try {
      await client.post('/charge', { amount: 10 });
    } catch (e) {
      thrown = e;
    }

    expect(thrown).toBeDefined();
    expect(thrown.response?.data).toEqual({
      pan: '[REDACTED]',
      cvv: '[REDACTED]',
      token: '[REDACTED]',
      nested: { card_number: '[REDACTED]', cvv2: '[REDACTED]' },
      safeMessage: 'declined',
    });
  });

  it('omits query strings from thrown error request URLs', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 400,
      statusText: 'Bad Request',
      headers: new Headers({ 'content-type': 'application/json' }),
      json: () => Promise.resolve({ error: 'bad' }),
      text: () => Promise.resolve(''),
    }) as unknown as typeof fetch;

    const client = new HttpClient({
      baseURL: 'https://gateway.example.com',
      timeout: 30000,
      headers: { 'Content-Type': 'application/json' },
      transformRequest: false,
      transformResponse: false,
    });

    let thrown: any;
    try {
      await client.get('/transaction', {
        params: { email_address: 'secret@example.com' },
      });
    } catch (e) {
      thrown = e;
    }

    expect(thrown).toBeDefined();
    expect(thrown.request?.url).toBe('/transaction');
    expect(JSON.stringify(thrown.request ?? {})).not.toContain(
      'secret@example.com'
    );
  });
});

describe('PayHQSDK.setCredentialsWithValidation console.warn gating', () => {
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it('does not call console.warn when debug is false', async () => {
    const sdk = new PayHQSDK({
      clientId: 'id',
      clientSecret: 'secret',
      sandbox: true,
      debug: false,
    });

    const initSpy = jest
      .spyOn(sdk as any, 'initialize')
      .mockResolvedValue(undefined as any);

    const aboutToExpire = Date.now() + 60 * 1000;
    await sdk.setCredentialsWithValidation('tok', aboutToExpire);

    expect(warnSpy).not.toHaveBeenCalled();
    initSpy.mockRestore();
  });

  it('does call console.warn when debug is true', async () => {
    const sdk = new PayHQSDK({
      clientId: 'id',
      clientSecret: 'secret',
      sandbox: true,
      debug: true,
    });

    const initSpy = jest
      .spyOn(sdk as any, 'initialize')
      .mockResolvedValue(undefined as any);

    const aboutToExpire = Date.now() + 60 * 1000;
    await sdk.setCredentialsWithValidation('tok', aboutToExpire);

    expect(warnSpy).toHaveBeenCalled();
    initSpy.mockRestore();
  });
});
