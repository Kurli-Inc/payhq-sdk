/**
 * Unit tests for AuthService (mocked HTTP)
 */

import { AuthService } from '../../src/services/AuthService';
import type { PayHQSDKConfig, Environment } from '../../src/types/common';

const mockPost = jest.fn();
const mockDelete = jest.fn();

jest.mock('../../src/utils/apiClient', () => ({
  createAuthClient: () => ({
    post: mockPost,
    get: jest.fn(),
    put: jest.fn(),
    delete: mockDelete,
  }),
  createApiClient: jest.fn(),
  withAuth: jest.fn((_: any, token: string) => ({
    headers: { Authorization: `Bearer ${token}` },
  })),
}));

const config: PayHQSDKConfig = {
  clientId: 'test-client',
  clientSecret: 'test-secret',
  timeout: 30000,
};

const environment: Environment = {
  authUrl: 'https://auth.example.com',
  gatewayUrl: 'https://gateway.example.com',
  name: 'sandbox',
};

describe('AuthService (unit)', () => {
  let authService: AuthService;

  beforeEach(() => {
    jest.clearAllMocks();
    authService = new AuthService(config, environment);
  });

  describe('getAuthorizationUrl', () => {
    it('builds URL with response_type, client_id, redirect_uri', () => {
      const url = authService.getAuthorizationUrl('https://app.com/cb');
      expect(url).toContain(environment.authUrl);
      expect(url).toContain('/oauth/authorize');
      expect(url).toContain('response_type=code');
      expect(url).toContain('client_id=test-client');
      expect(url).toContain('redirect_uri=');
    });
    it('appends state when provided', () => {
      const url = authService.getAuthorizationUrl(
        'https://app.com/cb',
        'my-state'
      );
      expect(url).toContain('state=my-state');
    });
    it('appends scope when provided', () => {
      const url = authService.getAuthorizationUrl(
        'https://app.com/cb',
        undefined,
        ['ecom', 'invoice']
      );
      expect(url).toContain('scope=');
    });
  });

  describe('validateToken', () => {
    it('returns invalid when no credentials', () => {
      const result = authService.validateToken();
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('No credentials');
    });
    it('returns valid when credentials exist and not expiring soon', () => {
      authService.setCredentials({
        access_token: 'tok',
        expires_at: Date.now() + 10 * 60 * 1000, // 10 min from now
      });
      const result = authService.validateToken();
      expect(result.valid).toBe(true);
      expect(result.expires_at).toBeDefined();
    });
    it('returns invalid when token expires in less than 5 minutes', () => {
      authService.setCredentials({
        access_token: 'tok',
        expires_at: Date.now() + 2 * 60 * 1000, // 2 min
      });
      const result = authService.validateToken();
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('expiring soon');
    });
  });

  describe('getCredentials / setCredentials', () => {
    it('returns null when no credentials set', () => {
      expect(authService.getCredentials()).toBeNull();
    });
    it('returns credentials after setCredentials', () => {
      const creds = {
        access_token: 'abc',
        expires_at: Date.now() + 60000,
      };
      authService.setCredentials(creds);
      expect(authService.getCredentials()).toEqual(creds);
    });
  });

  describe('clientCredentialsGrant', () => {
    it('calls POST /oauth/token and returns credentials', async () => {
      mockPost.mockResolvedValue({
        data: {
          access_token: 'new-token',
          token_type: 'Bearer',
          expires_in: 1200,
          merchant_id: 'merchant-1',
          scope: 'ecom invoice',
        },
        status: 200,
        statusText: 'OK',
      });

      const result = await authService.clientCredentialsGrant();

      expect(mockPost).toHaveBeenCalledWith(
        '/oauth/token',
        expect.objectContaining({
          grant_type: 'client_credentials',
          client_id: config.clientId,
          client_secret: config.clientSecret,
        }),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: expect.stringContaining('Basic '),
          }),
        })
      );
      expect(result.access_token).toBe('new-token');
      expect(result.expires_at).toBeGreaterThan(Date.now());
      expect(result.merchant_id).toBe('merchant-1');
      expect(result.scope).toEqual(['ecom', 'invoice']);
    });

    it('throws on API error', async () => {
      mockPost.mockRejectedValue({
        response: {
          status: 401,
          data: {
            error: 'INVALID_CREDENTIALS',
            error_description: 'Bad creds',
          },
        },
      });

      await expect(authService.clientCredentialsGrant()).rejects.toThrow();
    });
  });

  describe('getAuthHeader', () => {
    it('returns Bearer token when credentials are valid', async () => {
      authService.setCredentials({
        access_token: 'valid-token',
        expires_at: Date.now() + 10 * 60 * 1000,
      });
      const header = await authService.getAuthHeader();
      expect(header).toEqual({ Authorization: 'Bearer valid-token' });
    });
    it('refreshes and returns new token when expired', async () => {
      authService.setCredentials({
        access_token: 'old',
        expires_at: Date.now() - 1000, // expired
      });
      mockPost.mockResolvedValue({
        data: {
          access_token: 'refreshed-token',
          token_type: 'Bearer',
          expires_in: 1200,
        },
        status: 200,
        statusText: 'OK',
      });
      const header = await authService.getAuthHeader();
      expect(header.Authorization).toBe('Bearer refreshed-token');
    });
  });

  describe('refreshToken fallback console.warn gating', () => {
    it('does not call console.warn when refresh grant fails and debug is false', async () => {
      const svc = new AuthService({ ...config, debug: false }, environment);
      svc.setCredentials({
        access_token: 'expired',
        expires_at: Date.now() - 1000,
        refresh_token: 'rt-fail',
      });

      mockPost
        .mockRejectedValueOnce(new Error('refresh invalid'))
        .mockResolvedValueOnce({
          data: {
            access_token: 'from-client-creds',
            token_type: 'Bearer',
            expires_in: 1200,
          },
          status: 200,
          statusText: 'OK',
        });

      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      try {
        await svc.refreshToken();

        expect(warnSpy).not.toHaveBeenCalled();
        expect(svc.getCredentials()?.access_token).toBe('from-client-creds');
      } finally {
        warnSpy.mockRestore();
      }
    });

    it('calls console.warn when refresh grant fails and debug is true', async () => {
      const svc = new AuthService({ ...config, debug: true }, environment);
      svc.setCredentials({
        access_token: 'expired',
        expires_at: Date.now() - 1000,
        refresh_token: 'rt-fail',
      });

      mockPost
        .mockRejectedValueOnce(new Error('refresh invalid'))
        .mockResolvedValueOnce({
          data: {
            access_token: 'from-client-creds',
            token_type: 'Bearer',
            expires_in: 1200,
          },
          status: 200,
          statusText: 'OK',
        });

      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      try {
        await svc.refreshToken();

        expect(warnSpy).toHaveBeenCalled();
      } finally {
        warnSpy.mockRestore();
      }
    });
  });
});
