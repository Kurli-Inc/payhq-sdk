/**
 * Unit tests for TerminalService (mocked HTTP and Auth)
 */

import { TerminalService } from '../../src/services/TerminalService';
import type { Environment, PayHQSDKConfig } from '../../src/types/common';
import { PayHQErrorCode } from '../../src/types/errors';

const mockGet = jest.fn();
const mockPost = jest.fn();

const mockCreateApiClient = jest.fn(() => ({
  get: mockGet,
  post: mockPost,
  put: jest.fn(),
  delete: jest.fn(),
})) as jest.MockedFunction<(...args: any[]) => any>;

jest.mock('../../src/utils/apiClient', () => ({
  createApiClient: (...args: any[]) => mockCreateApiClient(...args),
  createAuthClient: jest.fn(),
  withAuth: jest.fn((_: any, token: string) => ({
    headers: { Authorization: `Bearer ${token}` },
  })),
}));

const config: PayHQSDKConfig = {
  clientId: 'id',
  clientSecret: 'secret',
  timeout: 30000,
};

const environment: Environment = {
  authUrl: 'https://auth.example.com',
  gatewayUrl: 'https://gateway.example.com',
  name: 'sandbox',
};

const mockAuthService = {
  getAuthHeader: jest.fn().mockResolvedValue({
    Authorization: 'Bearer fake-token',
  }),
};

describe('TerminalService (unit)', () => {
  let service: TerminalService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthService.getAuthHeader.mockResolvedValue({
      Authorization: 'Bearer fake-token',
    });
    service = new TerminalService(config, environment, mockAuthService as any);
  });

  describe('sale', () => {
    it('calls POST /sale/terminal with amount, currency, processor_id and is_card_terminal_transaction', async () => {
      mockPost.mockResolvedValue({
        data: {
          id: 100,
          transactionId: 'tx-1',
          transactionSuccess: true,
          transactionResult: 'APPROVED',
          transactionTime: Date.now(),
          transactionType: 'SALE',
          amount: 10,
        },
        status: 200,
        statusText: 'OK',
      });

      const result = await service.sale({
        amount: 10,
        currency: 'CAD',
        processorId: 12345,
      });

      expect(mockPost).toHaveBeenCalledWith(
        '/sale/terminal',
        expect.objectContaining({
          amount: 10,
          currency: 'CAD',
          processor_id: 12345,
          is_card_terminal_transaction: true,
        }),
        expect.any(Object)
      );
      expect(result.transactionType).toBe('SALE');
      expect(result.transactionSuccess).toBe(true);
    });

    it('maps fetch AbortError to TimeoutError instead of UNKNOWN_ERROR', async () => {
      mockPost.mockRejectedValue(
        new DOMException('This operation was aborted', 'AbortError')
      );

      await expect(
        service.sale({
          amount: 10,
          currency: 'CAD',
          processorId: 12345,
        })
      ).rejects.toMatchObject({
        code: PayHQErrorCode.TIMEOUT_ERROR,
        name: 'TimeoutError',
        statusCode: 408,
      });
    });
  });

  describe('saleWithCustomer', () => {
    it('calls POST /sale/terminalcustomer/{customerLookupId}', async () => {
      mockPost.mockResolvedValue({
        data: {
          id: 101,
          transactionId: 'tx-2',
          transactionSuccess: true,
          transactionResult: 'APPROVED',
          transactionTime: Date.now(),
          transactionType: 'SALE',
          amount: 25,
        },
        status: 200,
        statusText: 'OK',
      });

      await service.saleWithCustomer({
        customerLookupId: 'cust-abc',
        amount: 25,
        currency: 'CAD',
        processorId: 999,
      });

      expect(mockPost).toHaveBeenCalledWith(
        '/sale/terminalcustomer/cust-abc',
        expect.objectContaining({
          amount: 25,
          processor_id: 999,
          is_card_terminal_transaction: true,
        }),
        expect.any(Object)
      );
    });
  });

  describe('capture', () => {
    it('calls POST /capture/{transactionId} with terminal capture body', async () => {
      mockPost.mockResolvedValue({
        data: {
          id: 102,
          transactionId: 'tx-3',
          transactionSuccess: true,
          transactionResult: 'APPROVED',
          transactionTime: Date.now(),
          transactionType: 'CAPTURE',
          amount: 10,
        },
        status: 200,
        statusText: 'OK',
      });

      const result = await service.capture('auth-123', {
        amount: 10,
        currency: 'CAD',
        processorId: 12345,
        invoiceId: 'INV-1',
      });

      expect(mockPost).toHaveBeenCalledWith(
        '/capture/auth-123',
        expect.objectContaining({
          amount: 10,
          currency: 'CAD',
          processor_id: 12345,
          invoice_id: 'INV-1',
          is_card_terminal_transaction: true,
        }),
        expect.any(Object)
      );
      expect(mockGet).not.toHaveBeenCalled();
      expect(result.transactionType).toBe('CAPTURE');
    });
  });

  describe('refund', () => {
    it('calls POST /refund/{transactionId} with terminal refund body', async () => {
      mockPost.mockResolvedValue({
        data: {
          id: 103,
          transactionId: 'tx-4',
          transactionSuccess: true,
          transactionResult: 'APPROVED',
          transactionTime: Date.now(),
          transactionType: 'REFUND',
          amount: 10,
        },
        status: 200,
        statusText: 'OK',
      });

      const result = await service.refund({
        originalTransactionId: 'txn-1',
        amount: 10,
        currency: 'CAD',
        processorId: 12345,
      });

      expect(mockPost).toHaveBeenCalledWith(
        '/refund/txn-1',
        expect.objectContaining({
          amount: 10,
          currency: 'CAD',
          processor_id: 12345,
          is_card_terminal_transaction: true,
        }),
        expect.any(Object)
      );
      expect(result.transactionType).toBe('REFUND');
    });
  });

  describe('authorize', () => {
    it('calls POST /authorize/terminal with terminal authorize body', async () => {
      mockPost.mockResolvedValue({
        data: {
          id: 104,
          transactionId: 'tx-5',
          transactionSuccess: true,
          transactionResult: 'APPROVED',
          transactionTime: Date.now(),
          transactionType: 'AUTHORIZE',
          amount: 10,
        },
        status: 200,
        statusText: 'OK',
      });

      const result = await service.authorize({
        amount: 10,
        currency: 'CAD',
        processorId: 12345,
      });

      expect(mockPost).toHaveBeenCalledWith(
        '/authorize/terminal',
        expect.objectContaining({
          amount: 10,
          currency: 'CAD',
          processor_id: 12345,
          is_card_terminal_transaction: true,
        }),
        expect.any(Object)
      );
      expect(result.transactionType).toBe('AUTHORIZE');
    });
  });

  describe('terminal http client config', () => {
    it('uses terminalTimeout override for terminal http client', () => {
      const terminalConfig: PayHQSDKConfig = {
        clientId: 'id',
        clientSecret: 'secret',
        timeout: 30000,
        terminalTimeout: 90000,
      };

      mockCreateApiClient.mockClear();
      new TerminalService(terminalConfig, environment, mockAuthService as any);
      expect(mockCreateApiClient).toHaveBeenCalledWith(
        expect.objectContaining({ timeout: 90000, terminalTimeout: 90000 }),
        environment,
        'https://gateway.example.com/transaction-service-vt'
      );
    });
  });
});
