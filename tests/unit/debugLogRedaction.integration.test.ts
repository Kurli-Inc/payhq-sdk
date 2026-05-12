/**
 * Debug mode must not print full PAN, CVV, or secrets to stdout.
 */

import { HttpClient } from '../../src/utils/apiClient';
import { TransactionService } from '../../src/services/TransactionService';
import type { PayHQSDKConfig, Environment } from '../../src/types/common';

const mockPost = jest.fn();

jest.mock('../../src/utils/apiClient', () => {
  const actual = jest.requireActual<typeof import('../../src/utils/apiClient')>(
    '../../src/utils/apiClient'
  );
  return {
    ...actual,
    createApiClient: jest.fn(() => ({
      get: jest.fn(),
      post: mockPost,
      put: jest.fn(),
      delete: jest.fn(),
    })),
    createAuthClient: jest.fn(),
  };
});

const PAN = '4111111111111111';

describe('HttpClient debug logging (card payloads)', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('does not log the full card number when debug and transforms are on', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: { get: () => 'application/json' },
      json: () => Promise.resolve({ data: { card_number: PAN, amount: 1 } }),
    }) as unknown as typeof fetch;

    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    const client = new HttpClient({
      baseURL: 'https://gateway.example.com',
      timeout: 30000,
      headers: { 'Content-Type': 'application/json' },
      transformRequest: true,
      transformResponse: true,
      debug: true,
    });

    try {
      await client.post('/sale', {
        cardNumber: PAN,
        amount: 1,
        currency: 'CAD',
      });
      const combined = allConsoleArgsText(logSpy.mock.calls);
      expect(combined).not.toContain(PAN);
    } finally {
      logSpy.mockRestore();
    }
  });
});

const txnConfig: PayHQSDKConfig = {
  clientId: 'c',
  clientSecret: 's',
  timeout: 30000,
  debug: true,
};

const environment: Environment = {
  authUrl: 'https://auth.example.com',
  gatewayUrl: 'https://gateway.example.com',
  name: 'sandbox',
};

const mockAuth = {
  getAuthHeader: jest.fn().mockResolvedValue({ Authorization: 'Bearer tok' }),
};

describe('TransactionService createSale debug logging', () => {
  let logSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    mockPost.mockResolvedValue({
      data: { id: 1, amount: 1, currency: 'CAD' },
      status: 200,
      statusText: 'OK',
    });
    mockAuth.getAuthHeader.mockResolvedValue({ Authorization: 'Bearer tok' });
  });

  afterEach(() => {
    logSpy.mockRestore();
  });

  it('does not log the full card number in createSale', async () => {
    const service = new TransactionService(
      txnConfig,
      environment,
      mockAuth as any
    );

    await service.createSale({
      amount: 1,
      currency: 'CAD',
      card: {
        cardNumber: PAN,
        cardExpiryMonth: 12,
        cardExpiryYear: 30,
        cvv2: '123',
      },
    });

    const combined = allConsoleArgsText(logSpy.mock.calls);
    expect(combined).not.toContain(PAN);
    expect(combined).not.toMatch(/"cvv2"\s*:\s*"123"/);
  });
});

function allConsoleArgsText(calls: unknown[][]): string {
  return calls
    .flat()
    .map(arg =>
      typeof arg === 'string' || typeof arg === 'number'
        ? String(arg)
        : JSON.stringify(arg)
    )
    .join('\n');
}
