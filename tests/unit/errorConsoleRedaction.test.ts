/**
 * Library error handlers must not write secrets or payment payloads to stderr.
 */

import { AuthService } from '../../src/services/AuthService';
import { TransactionService } from '../../src/services/TransactionService';
import type { PayHQSDKConfig, Environment } from '../../src/types/common';

const authPostMock = jest.fn();
const txnPostMock = jest.fn();
const txnGetMock = jest.fn();

jest.mock('../../src/utils/apiClient', () => ({
  createAuthClient: jest.fn(() => ({
    post: authPostMock,
    get: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  })),
  createApiClient: jest.fn(() => ({
    get: txnGetMock,
    post: txnPostMock,
    put: jest.fn(),
    delete: jest.fn(),
  })),
  withAuth: jest.fn((_: unknown, token: string) => ({
    headers: { Authorization: `Bearer ${token}` },
  })),
}));

const environment: Environment = {
  authUrl: 'https://auth.example.com',
  gatewayUrl: 'https://gateway.example.com',
  name: 'sandbox',
};

function allConsoleErrorText(calls: unknown[][]): string {
  return calls
    .flat()
    .map(arg =>
      typeof arg === 'string' || typeof arg === 'number'
        ? String(arg)
        : JSON.stringify(arg)
    )
    .join('\n');
}

describe('AuthService handleAuthError console redaction', () => {
  const baseAuthConfig: PayHQSDKConfig = {
    clientId: 'cid',
    clientSecret: 'oauth-body-secret-xyz',
    timeout: 30000,
  };

  let errorSpy: jest.SpyInstance;
  beforeEach(() => {
    jest.clearAllMocks();
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
  });

  it('does not write OAuth request body (client_secret) to console.error', async () => {
    authPostMock.mockRejectedValueOnce({
      response: {
        status: 400,
        data: { error: 'invalid_client', error_description: 'Bad credentials' },
        headers: {},
      },
      request: {
        url: 'https://auth.example.com/oauth/token',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: {
          grant_type: 'client_credentials',
          client_secret: 'oauth-body-secret-xyz',
        },
      },
    });

    const auth = new AuthService(
      { ...baseAuthConfig, debug: true },
      environment
    );
    await expect(auth.clientCredentialsGrant()).rejects.toBeDefined();

    const text = allConsoleErrorText(errorSpy.mock.calls);
    expect(text).not.toContain('oauth-body-secret-xyz');
  });

  it('does not write auth error details to console.error when debug is false even if PAYFIRMA_DEBUG is set', async () => {
    const prevDebug = process.env['PAYFIRMA_DEBUG'];
    process.env['PAYFIRMA_DEBUG'] = '1';

    authPostMock.mockRejectedValueOnce({
      response: {
        status: 400,
        data: { error: 'invalid_client', error_description: 'Bad credentials' },
        headers: {},
      },
      request: {
        url: 'https://auth.example.com/oauth/token',
      },
    });

    try {
      const auth = new AuthService(
        { ...baseAuthConfig, debug: false },
        environment
      );
      await expect(auth.clientCredentialsGrant()).rejects.toBeDefined();
      expect(errorSpy).not.toHaveBeenCalled();
    } finally {
      if (prevDebug === undefined) {
        delete process.env['PAYFIRMA_DEBUG'];
      } else {
        process.env['PAYFIRMA_DEBUG'] = prevDebug;
      }
    }
  });
});

describe('TransactionService handleError console redaction', () => {
  const txnConfig: PayHQSDKConfig = {
    clientId: 'c',
    clientSecret: 's',
    timeout: 30000,
    debug: true,
  };

  const mockAuth = {
    getAuthHeader: jest.fn().mockResolvedValue({
      Authorization: 'Bearer tok',
    }),
  };

  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockAuth.getAuthHeader.mockResolvedValue({
      Authorization: 'Bearer tok',
    });
  });

  afterEach(() => {
    errorSpy.mockRestore();
  });

  it('does not write card data from error.request.body to console.error', async () => {
    txnGetMock.mockRejectedValueOnce({
      response: {
        status: 400,
        data: { error: 'validation_failed', message: 'bad request' },
        headers: {},
      },
      request: {
        url: 'https://gateway.example.com/transaction-service/transaction/1',
        headers: {},
        body: { card_number: '4111111111111111', cvv2: '999' },
      },
    });

    const service = new TransactionService(
      txnConfig,
      environment,
      mockAuth as any
    );

    await expect(service.getTransaction('1')).rejects.toBeDefined();

    const text = allConsoleErrorText(errorSpy.mock.calls);
    expect(text).not.toContain('4111111111111111');
    expect(text).not.toContain('999');
  });
});
