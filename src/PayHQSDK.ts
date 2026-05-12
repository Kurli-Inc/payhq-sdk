/**
 * Main PayHQ SDK class that provides access to all services
 */

import { PayHQSDKConfig, Environment } from './types/common';
import { ConfigurationError } from './types/errors';
import {
  AuthService,
  CustomerService,
  TransactionService,
  TerminalService,
} from './services';

/**
 * Main PayHQ SDK class
 *
 * @example
 * ```typescript
 * const sdk = new PayHQSDK({
 *   clientId: 'your-client-id',
 *   clientSecret: 'your-client-secret',
 *   sandbox: true
 * });
 *
 * // Initialize authentication
 * await sdk.initialize();
 *
 * // Use the services
 * const customer = await sdk.customers.createCustomer({
 *   email: 'customer@example.com',
 *   firstName: 'John',
 *   lastName: 'Doe'
 * });
 * ```
 */
export class PayHQSDK {
  private config: PayHQSDKConfig;
  private environment: Environment;
  private authService: AuthService;
  private initialized = false;

  /** Authentication service (OAuth 2.0) */
  public readonly auth: AuthService;
  /** Customer management service */
  public readonly customers: CustomerService;
  /** Transaction processing service */
  public readonly transactions: TransactionService;
  /** Card terminal service */
  public readonly terminals: TerminalService;

  /**
   * Create an SDK instance bound to sandbox or production.
   */
  constructor(config: PayHQSDKConfig) {
    const immutableConfig = PayHQSDK.deepFreeze(PayHQSDK.deepClone(config));
    this.validateConfig(immutableConfig);
    this.config = immutableConfig;
    this.environment = this.getEnvironment(immutableConfig.sandbox || false);

    this.authService = new AuthService(this.config, this.environment);
    this.auth = this.authService;

    this.customers = new CustomerService(
      this.config,
      this.environment,
      this.authService
    );
    this.transactions = new TransactionService(
      this.config,
      this.environment,
      this.authService
    );
    this.terminals = new TerminalService(
      this.config,
      this.environment,
      this.authService
    );
  }

  /**
   * Initialize the SDK with authentication
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      await this.authService.clientCredentialsGrant();
      this.initialized = true;
    } catch (error) {
      throw new ConfigurationError(
        'Failed to initialize SDK: Authentication failed',
        { originalError: error }
      );
    }
  }

  /**
   * Check if SDK is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Get current environment
   */
  getCurrentEnvironment(): Environment {
    return this.environment;
  }

  /**
   * Get a snapshot of the current SDK configuration.
   *
   * Configuration is immutable for the lifetime of an SDK instance — to change
   * sandbox/timeout/etc., construct a new `PayHQSDK`.
   */
  getConfig(): PayHQSDKConfig {
    return PayHQSDK.deepClone(this.config);
  }

  /**
   * Set custom credentials for partner integrations
   */
  setCredentials(accessToken: string, expiresAt?: number): void {
    const credentials: any = {
      access_token: accessToken,
      expires_at: expiresAt || Date.now() + 12 * 60 * 60 * 1000, // Default 12 hours
      scope: ['ecom', 'invoice', 'terminal', 'eft'],
    };

    this.authService.setCredentials(credentials);
    this.initialized = true;
  }

  /**
   * Set custom credentials with validation for partner integrations
   * This method validates the token expiry and will force fresh authentication if needed
   */
  async setCredentialsWithValidation(
    accessToken: string,
    expiresAt?: number
  ): Promise<void> {
    const now = Date.now();
    const expirationTime = expiresAt || now + 12 * 60 * 60 * 1000;
    const bufferTime = 5 * 60 * 1000; // 5 minutes buffer

    if (expirationTime - now <= bufferTime) {
      if (this.config.debug) {
        console.warn(
          'Provided token expires soon, getting fresh credentials...'
        );
      }
      await this.initialize();
      return;
    }

    const credentials: any = {
      access_token: accessToken,
      expires_at: expirationTime,
      scope: ['ecom', 'invoice', 'terminal', 'eft'],
    };

    this.authService.setCredentials(credentials);
    this.initialized = true;
  }

  /**
   * Get authorization URL for OAuth flow
   */
  getAuthorizationUrl(
    redirectUri: string,
    state?: string,
    scopes?: string[]
  ): string {
    return this.authService.getAuthorizationUrl(redirectUri, state, scopes);
  }

  /**
   * Exchange authorization code for access token
   */
  async exchangeCodeForToken(
    code: string,
    redirectUri: string,
    state?: string
  ): Promise<void> {
    await this.authService.authorizationCodeGrant(code, redirectUri, state);
    this.initialized = true;
  }

  /**
   * Refresh access token using refresh token or fallback to client credentials
   * The AuthService will automatically use client credentials if no refresh token is available
   */
  async refreshToken(): Promise<void> {
    await this.authService.refreshToken();
  }

  /**
   * Revoke current token and reset SDK
   */
  async revoke(): Promise<void> {
    await this.authService.revokeToken();
    this.initialized = false;
  }

  /**
   * Get current authentication status
   */
  getAuthStatus(): {
    isAuthenticated: boolean;
    tokenValid: boolean;
    expiresAt?: number;
  } {
    const credentials = this.authService.getCredentials();
    if (!credentials) {
      return {
        isAuthenticated: false,
        tokenValid: false,
      };
    }

    const validation = this.authService.validateToken();
    const result: any = {
      isAuthenticated: true,
      tokenValid: validation.valid,
    };

    if (validation.expires_at !== undefined) {
      result.expiresAt = validation.expires_at;
    }

    return result;
  }

  /**
   * Validate SDK configuration
   */
  private validateConfig(config: PayHQSDKConfig): void {
    if (!config.clientId) {
      throw new ConfigurationError('Client ID is required');
    }

    if (!config.clientSecret) {
      throw new ConfigurationError('Client Secret is required');
    }

    if (config.timeout && (config.timeout < 1000 || config.timeout > 300000)) {
      throw new ConfigurationError(
        'Timeout must be between 1000ms and 300000ms'
      );
    }
  }

  /**
   * Get environment configuration
   */
  private getEnvironment(sandbox: boolean): Environment {
    if (sandbox) {
      return {
        authUrl:
          this.config.apiUrls?.auth || 'https://sandbox-auth.payfirma.com',
        gatewayUrl:
          this.config.apiUrls?.gateway ||
          'https://sandbox-apigateway.payfirma.com',
        name: 'sandbox',
      };
    }

    return {
      authUrl: this.config.apiUrls?.auth || 'https://auth.payfirma.com',
      gatewayUrl:
        this.config.apiUrls?.gateway || 'https://apigateway.payfirma.com',
      name: 'production',
    };
  }

  /**
   * Create a new SDK instance with different configuration
   */
  static create(config: PayHQSDKConfig): PayHQSDK {
    return new PayHQSDK(config);
  }

  /**
   * Create a sandbox SDK instance
   */
  static createSandbox(clientId: string, clientSecret: string): PayHQSDK {
    return new PayHQSDK({
      clientId,
      clientSecret,
      sandbox: true,
    });
  }

  /**
   * Create a production SDK instance
   */
  static createProduction(clientId: string, clientSecret: string): PayHQSDK {
    return new PayHQSDK({
      clientId,
      clientSecret,
      sandbox: false,
    });
  }

  /**
   * Clone nested config objects so callers cannot mutate internal state.
   */
  private static deepClone<T>(value: T): T {
    if (value === null || typeof value !== 'object') {
      return value;
    }

    if (Array.isArray(value)) {
      return value.map(item => PayHQSDK.deepClone(item)) as T;
    }

    const clone = {} as Record<string, unknown>;
    for (const [key, nestedValue] of Object.entries(
      value as Record<string, unknown>
    )) {
      clone[key] = PayHQSDK.deepClone(nestedValue);
    }
    return clone as T;
  }

  /**
   * Freeze nested config objects to enforce runtime immutability.
   */
  private static deepFreeze<T>(value: T): T {
    if (value === null || typeof value !== 'object') {
      return value;
    }

    for (const nestedValue of Object.values(value as Record<string, unknown>)) {
      PayHQSDK.deepFreeze(nestedValue);
    }

    return Object.freeze(value);
  }
}
