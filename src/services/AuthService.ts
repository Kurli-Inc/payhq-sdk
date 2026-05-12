/**
 * Authentication service for managing OAuth 2.0 tokens
 */

import { HttpClient } from '../utils/apiClient';
import {
  TokenResponse,
  ClientCredentialsRequest,
  AuthorizationCodeRequest,
  RefreshTokenRequest,
  AuthCredentials,
  TokenValidation,
  JWTPayload,
} from '../types/auth';
import { PayHQSDKConfig, Environment } from '../types/common';
import { AuthenticationError, ErrorFactory, PayHQError } from '../types/errors';
import { createAuthClient } from '../utils/apiClient';

/**
 * Authentication service for OAuth 2.0 flow
 */
export class AuthService {
  private config: PayHQSDKConfig;
  private environment: Environment;
  private httpClient: HttpClient;
  private credentials: AuthCredentials | null = null;
  private tokenRefreshPromise: Promise<AuthCredentials> | null = null;

  /**
   * Create an auth client configured for the selected environment.
   */
  constructor(config: PayHQSDKConfig, environment: Environment) {
    this.config = config;
    this.environment = environment;

    this.httpClient = createAuthClient(config, environment);
  }

  /**
   * Generate Basic Auth header for client credentials
   */
  private getBasicAuthHeader(): string {
    const credentials = `${this.config.clientId}:${this.config.clientSecret}`;
    return `Basic ${Buffer.from(credentials).toString('base64')}`;
  }

  /**
   * Client credentials grant - get access token for your own account
   */
  async clientCredentialsGrant(): Promise<AuthCredentials> {
    const request: ClientCredentialsRequest = {
      grant_type: 'client_credentials',
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
    };

    try {
      const response = await this.httpClient.post<TokenResponse>(
        '/oauth/token',
        request,
        {
          headers: {
            Authorization: this.getBasicAuthHeader(),
          },
        }
      );

      const tokenData = response.data;
      const credentials: AuthCredentials = {
        access_token: tokenData.access_token,
        expires_at: Date.now() + tokenData.expires_in * 1000,
        ...(tokenData.refresh_token && {
          refresh_token: tokenData.refresh_token,
        }),
        ...(tokenData.merchant_id && { merchant_id: tokenData.merchant_id }),
        ...(tokenData.scope && { scope: tokenData.scope.split(' ') }),
      };

      this.credentials = credentials;
      return credentials;
    } catch (error: any) {
      throw this.handleAuthError(error);
    }
  }

  /**
   * Authorization code grant - exchange authorization code for access token
   */
  async authorizationCodeGrant(
    code: string,
    redirectUri: string,
    state?: string
  ): Promise<AuthCredentials> {
    const request: AuthorizationCodeRequest = {
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      ...(state && { state }),
    };

    try {
      const response = await this.httpClient.post<TokenResponse>(
        '/oauth/token',
        request,
        {
          headers: {
            Authorization: this.getBasicAuthHeader(),
          },
        }
      );

      const tokenData = response.data;
      const credentials: AuthCredentials = {
        access_token: tokenData.access_token,
        expires_at: Date.now() + tokenData.expires_in * 1000,
        ...(tokenData.refresh_token && {
          refresh_token: tokenData.refresh_token,
        }),
        ...(tokenData.merchant_id && { merchant_id: tokenData.merchant_id }),
        ...(tokenData.scope && { scope: tokenData.scope.split(' ') }),
      };

      this.credentials = credentials;
      return credentials;
    } catch (error: any) {
      throw this.handleAuthError(error);
    }
  }

  /**
   * Refresh token grant - get new access token using refresh token
   * If no refresh token is available, falls back to client credentials grant
   */
  async refreshToken(refreshToken?: string): Promise<AuthCredentials> {
    // If a refresh is already in progress, return that promise
    if (this.tokenRefreshPromise) {
      return this.tokenRefreshPromise;
    }

    const tokenToUse = refreshToken || this.credentials?.refresh_token;

    this.tokenRefreshPromise = (async () => {
      try {
        // If we have a refresh token, try to use it
        if (tokenToUse) {
          const request: RefreshTokenRequest = {
            grant_type: 'refresh_token',
            refresh_token: tokenToUse,
            client_id: this.config.clientId,
            client_secret: this.config.clientSecret,
          };

          try {
            const response = await this.httpClient.post<TokenResponse>(
              '/oauth/token',
              request,
              {
                headers: {
                  Authorization: this.getBasicAuthHeader(),
                },
              }
            );

            const tokenData = response.data;
            const credentials: AuthCredentials = {
              access_token: tokenData.access_token,
              expires_at: Date.now() + tokenData.expires_in * 1000,
              ...(tokenData.refresh_token && {
                refresh_token: tokenData.refresh_token,
              }),
              merchant_id: tokenData.merchant_id,
              ...(tokenData.scope && { scope: tokenData.scope.split(' ') }),
            };

            this.credentials = credentials;
            return credentials;
          } catch (refreshError) {
            if (this.config.debug) {
              const safeRefreshErrorMessage =
                refreshError instanceof Error
                  ? refreshError.message
                  : 'No error message available';
              console.warn(
                'Refresh token failed, falling back to client credentials.',
                safeRefreshErrorMessage
              );
            }
          }
        }

        // No refresh token available or refresh failed - use client credentials
        return await this.clientCredentialsGrant();
      } catch (error: any) {
        throw this.handleAuthError(error);
      } finally {
        this.tokenRefreshPromise = null;
      }
    })();

    return this.tokenRefreshPromise;
  }

  /**
   * Get the authorization URL for OAuth 2.0 flow
   */
  getAuthorizationUrl(
    redirectUri: string,
    state?: string,
    scopes?: string[]
  ): string {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.config.clientId,
      redirect_uri: redirectUri,
    });

    if (state) {
      params.append('state', state);
    }

    if (scopes && scopes.length > 0) {
      params.append('scope', scopes.join(' '));
    }

    return `${this.environment.authUrl}/oauth/authorize?${params.toString()}`;
  }

  /**
   * Revoke the current access token
   */
  async revokeToken(): Promise<void> {
    if (!this.credentials) {
      return;
    }

    try {
      await this.httpClient.delete('/oauth/revoke_token', {
        headers: {
          Authorization: `Bearer ${this.credentials.access_token}`,
        },
      });
    } catch (error: any) {
      // Ignore errors when revoking token
    } finally {
      this.credentials = null;
    }
  }

  /**
   * Get current credentials
   */
  getCredentials(): AuthCredentials | null {
    return this.credentials;
  }

  /**
   * Set credentials (useful for restoring from storage)
   */
  setCredentials(credentials: AuthCredentials): void {
    this.credentials = credentials;
  }

  /**
   * Validate current token
   */
  validateToken(): TokenValidation {
    if (!this.credentials) {
      return {
        valid: false,
        reason: 'No credentials available',
      };
    }

    const now = Date.now();
    const expiresAt = this.credentials.expires_at;
    const timeToExpiry = expiresAt - now;

    // Consider token expired if it expires in less than 5 minutes
    const bufferTime = 5 * 60 * 1000; // 5 minutes

    if (timeToExpiry <= bufferTime) {
      return {
        valid: false,
        expires_at: expiresAt,
        reason: 'Token expired or expiring soon',
      };
    }

    return {
      valid: true,
      expires_at: expiresAt,
    };
  }

  /**
   * Get a valid access token, refreshing if necessary
   * Now uses client credentials fallback when refresh tokens are not available
   */
  async getValidToken(): Promise<string> {
    const validation = this.validateToken();

    if (!validation.valid) {
      // refreshToken() now handles both refresh token and client credentials fallback
      await this.refreshToken();
    }

    return this.credentials!.access_token;
  }

  /**
   * Get Bearer authorization header
   */
  async getAuthHeader(): Promise<{ Authorization: string }> {
    const token = await this.getValidToken();
    return { Authorization: `Bearer ${token}` };
  }

  /**
   * Parse JWT token payload (without verification)
   */
  parseTokenPayload(token: string): JWTPayload {
    try {
      const parts = token.split('.');
      if (parts.length !== 3 || !parts[1]) {
        throw new Error('Invalid JWT format');
      }

      const payload = JSON.parse(
        Buffer.from(parts[1], 'base64').toString('utf-8')
      );
      return payload;
    } catch (error: any) {
      throw new AuthenticationError('Invalid token format', {
        originalError: error.message,
      });
    }
  }

  /**
   * Build a sanitized auth error payload with only safe fields.
   */
  private sanitizeAuthPayload(
    status: number,
    data: any,
    request: any
  ): {
    status: number;
    errorCode?: string;
    errorDescription?: string;
    request?: { method?: string; url?: string };
  } {
    return {
      status,
      ...(typeof data?.error === 'string' && { errorCode: data.error }),
      ...(typeof data?.error_description === 'string' && {
        errorDescription: data.error_description,
      }),
      request: {
        ...(typeof request?.method === 'string' && { method: request.method }),
        ...(typeof request?.url === 'string' && { url: request.url }),
      },
    };
  }

  /**
   * Handle authentication errors
   */
  private handleAuthError(error: any): PayHQError {
    if (error.response) {
      const { status, data, headers } = error.response;
      const requestId = headers?.['x-request-id'] || undefined;

      // Log detailed error information for debugging
      if (this.config.debug) {
        // Never log headers, response body, or request body — OAuth and errors
        // can include client_secret, refresh_token, or card data.
        console.error('PayFirma Authentication Error Details:');
        console.error('Status:', status);
        console.error('Request URL:', error.request?.url);
      }

      if (data?.error) {
        const sanitizedPayload = this.sanitizeAuthPayload(
          status,
          data,
          error.request
        );
        return ErrorFactory.fromApiResponse(
          {
            code: data.error,
            message: data.error_description || 'Authentication failed',
            status,
            details: sanitizedPayload,
            request_id: requestId,
          },
          error
        );
      }

      const sanitizedPayload = this.sanitizeAuthPayload(
        status,
        data,
        error.request
      );
      return new AuthenticationError(
        `Authentication failed: ${status}`,
        {
          ...sanitizedPayload,
        },
        requestId,
        error
      );
    }

    if (error.request) {
      return ErrorFactory.networkError(
        'Network error during authentication',
        error
      );
    }

    return new AuthenticationError(
      'Authentication failed',
      { originalError: error.message },
      undefined,
      error
    );
  }
}
