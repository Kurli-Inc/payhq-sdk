/**
 * Verifies that user-supplied config (timeout, debug) propagates from
 * PayHQSDK into each service's HttpClient. Regression test for the
 * placeholder `{ clientId: '', clientSecret: '', timeout: 30000 }` constructor
 * literals that previously hardcoded service config.
 */

import {
  type PayHQSDKConfig,
  type Environment,
  PAYHQ_DEFAULT_TERMINAL_TIMEOUT_MS,
} from '../../src/types/common';

const mockCreateApiClient: jest.Mock<any, any[]> = jest.fn(() => ({
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  patch: jest.fn(),
  delete: jest.fn(),
}));

jest.mock('../../src/utils/apiClient', () => ({
  createApiClient: (...args: any[]) => mockCreateApiClient(...args),
  createAuthClient: jest.fn(() => ({
    post: jest.fn(),
    get: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  })),
  withAuth: jest.fn((_: any, token: string) => ({
    headers: { Authorization: `Bearer ${token}` },
  })),
}));

import { CustomerService } from '../../src/services/CustomerService';
import { TerminalService } from '../../src/services/TerminalService';
import { TransactionService } from '../../src/services/TransactionService';
import { PayHQSDK } from '../../src/PayHQSDK';

const config: PayHQSDKConfig = {
  clientId: 'id',
  clientSecret: 'secret',
  timeout: 1234,
  terminalTimeout: 90000,
  debug: true,
};

const environment: Environment = {
  authUrl: 'https://auth.example.com',
  gatewayUrl: 'https://gateway.example.com',
  name: 'sandbox',
};

const mockAuthService: any = {
  getAuthHeader: jest.fn().mockResolvedValue({ Authorization: 'Bearer t' }),
};

describe('service config propagation', () => {
  beforeEach(() => {
    mockCreateApiClient.mockClear();
  });

  it('CustomerService receives the real PayHQSDKConfig (timeout, debug)', () => {
    new CustomerService(config, environment, mockAuthService);
    const calledWith = mockCreateApiClient.mock.calls[0]?.[0];
    expect(calledWith).toBeDefined();
    expect(calledWith.timeout).toBe(1234);
    expect(calledWith.debug).toBe(true);
  });

  it('TerminalService receives terminalTimeout when provided', () => {
    new TerminalService(config, environment, mockAuthService);
    const calledWith = mockCreateApiClient.mock.calls[0]?.[0];
    expect(calledWith).toBeDefined();
    expect(calledWith.timeout).toBe(90000);
    expect(calledWith.terminalTimeout).toBe(90000);
    expect(calledWith.debug).toBe(true);
  });

  it('TerminalService falls back to global timeout when terminalTimeout is not provided', () => {
    const fallbackConfig: PayHQSDKConfig = {
      clientId: 'id',
      clientSecret: 'secret',
      timeout: 1234,
      debug: true,
    };
    new TerminalService(fallbackConfig, environment, mockAuthService);
    const calledWith = mockCreateApiClient.mock.calls[0]?.[0];
    expect(calledWith.timeout).toBe(1234);
  });

  it('TerminalService uses default terminal timeout when neither timeout nor terminalTimeout is set', () => {
    const minimal: PayHQSDKConfig = {
      clientId: 'id',
      clientSecret: 'secret',
    };
    new TerminalService(minimal, environment, mockAuthService);
    const calledWith = mockCreateApiClient.mock.calls[0]?.[0];
    expect(calledWith?.timeout).toBe(PAYHQ_DEFAULT_TERMINAL_TIMEOUT_MS);
  });

  it('TransactionService receives the real PayHQSDKConfig (timeout, debug)', () => {
    new TransactionService(config, environment, mockAuthService);
    const calledWith = mockCreateApiClient.mock.calls[0]?.[0];
    expect(calledWith).toBeDefined();
    expect(calledWith.timeout).toBe(1234);
    expect(calledWith.debug).toBe(true);
  });

  it('CustomerService and TransactionService continue using global timeout when terminalTimeout is set', () => {
    const splitConfig: PayHQSDKConfig = {
      clientId: 'id',
      clientSecret: 'secret',
      timeout: 5000,
      terminalTimeout: 90000,
      debug: true,
    };

    new CustomerService(splitConfig, environment, mockAuthService);
    let calledWith = mockCreateApiClient.mock.calls[0]?.[0] as
      | PayHQSDKConfig
      | undefined;
    expect(calledWith?.timeout).toBe(5000);

    mockCreateApiClient.mockClear();
    new TransactionService(splitConfig, environment, mockAuthService);
    calledWith = mockCreateApiClient.mock.calls[0]?.[0] as
      | PayHQSDKConfig
      | undefined;
    expect(calledWith?.timeout).toBe(5000);
  });

  it('PayHQSDK propagates timeout/debug to every service', () => {
    new PayHQSDK(config);
    // Three services that use createApiClient: customers, transactions, terminals
    expect(mockCreateApiClient).toHaveBeenCalledTimes(3);
    const customersCfg = mockCreateApiClient.mock.calls[0]?.[0] as
      | PayHQSDKConfig
      | undefined;
    const transactionsCfg = mockCreateApiClient.mock.calls[1]?.[0] as
      | PayHQSDKConfig
      | undefined;
    const terminalsCfg = mockCreateApiClient.mock.calls[2]?.[0] as
      | PayHQSDKConfig
      | undefined;
    expect(customersCfg?.timeout).toBe(1234);
    expect(transactionsCfg?.timeout).toBe(1234);
    expect(terminalsCfg?.timeout).toBe(90000);
    for (const call of mockCreateApiClient.mock.calls) {
      const passed = call[0] as PayHQSDKConfig;
      expect(passed.debug).toBe(true);
    }
  });

  it('PayHQSDK uses default terminal timeout when timeouts omitted', () => {
    new PayHQSDK({
      clientId: 'id',
      clientSecret: 'secret',
      sandbox: true,
    });
    expect(mockCreateApiClient).toHaveBeenCalledTimes(3);
    const customersCfg = mockCreateApiClient.mock.calls[0]?.[0] as
      | PayHQSDKConfig
      | undefined;
    const transactionsCfg = mockCreateApiClient.mock.calls[1]?.[0] as
      | PayHQSDKConfig
      | undefined;
    const terminalsCfg = mockCreateApiClient.mock.calls[2]?.[0] as
      | PayHQSDKConfig
      | undefined;
    expect(customersCfg?.timeout).toBeUndefined();
    expect(transactionsCfg?.timeout).toBeUndefined();
    expect(terminalsCfg?.timeout).toBe(PAYHQ_DEFAULT_TERMINAL_TIMEOUT_MS);
  });
});
