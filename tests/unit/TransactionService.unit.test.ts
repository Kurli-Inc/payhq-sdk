/**
 * Unit tests for TransactionService (mocked HTTP and Auth)
 */

import { TransactionService } from '../../src/services/TransactionService';
import type { PayHQSDKConfig, Environment } from '../../src/types/common';

const mockGet = jest.fn();
const mockPost = jest.fn();

jest.mock('../../src/utils/apiClient', () => ({
  createApiClient: () => ({
    get: mockGet,
    post: mockPost,
    put: jest.fn(),
    delete: jest.fn(),
  }),
  createAuthClient: jest.fn(),
  withAuth: jest.fn((config: any, token: string) => ({
    ...config,
    headers: { ...(config?.headers || {}), Authorization: `Bearer ${token}` },
  })),
}));

const config: PayHQSDKConfig = {
  clientId: 'test',
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

describe('TransactionService (unit)', () => {
  let service: TransactionService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthService.getAuthHeader.mockResolvedValue({
      Authorization: 'Bearer fake-token',
    });
    service = new TransactionService(
      config,
      environment,
      mockAuthService as any
    );
  });

  describe('createSale', () => {
    it('calls POST /sale with amount, currency, card fields', async () => {
      mockPost.mockResolvedValue({
        data: {
          id: 1,
          transactionId: 'tx-123',
          transactionSuccess: true,
          transactionResult: 'APPROVED',
          transactionMessage: '',
          transactionTime: Date.now(),
          transactionType: 'SALE',
          amount: 50.99,
        },
        status: 200,
        statusText: 'OK',
      });
      const testPanChunk1 = '4111';
      const testPanChunk2 = '1111';
      const testPanChunk3 = '11111111';
      const testPan = testPanChunk1 + testPanChunk2 + testPanChunk3;

      const result = await service.createSale({
        amount: 50.99,
        currency: 'CAD',
        card: {
          cardNumber: testPan,
          cardExpiryMonth: 12,
          cardExpiryYear: 25,
          cvv2: '123',
        },
      });

      expect(mockPost).toHaveBeenCalledWith(
        '/sale',
        expect.objectContaining({
          amount: 50.99,
          currency: 'CAD',
          cardNumber: testPan,
          cardExpiryMonth: 12,
          cardExpiryYear: 25,
          cvv2: '123',
        }),
        expect.any(Object)
      );
      expect(result.transactionType).toBe('SALE');
      expect(result.amount).toBe(50.99);
    });

    it('routes createSale with customerLookupId and no card/token to default-card sale endpoint with amount only', async () => {
      mockPost.mockResolvedValue({
        data: {
          id: 1,
          transactionId: 'tx-cust',
          transactionSuccess: true,
          transactionResult: 'APPROVED',
          transactionMessage: '',
          transactionTime: Date.now(),
          transactionType: 'SALE',
          amount: 25,
        },
        status: 200,
        statusText: 'OK',
      });

      await service.createSale({
        amount: 25,
        currency: 'CAD',
        customerLookupId: 'cust-1',
      });

      expect(mockPost).toHaveBeenCalledWith(
        '/sale/customer/cust-1',
        { amount: 25 },
        expect.any(Object)
      );
    });

    it('routes createSale with customerLookupId and cardLookupId to stored-card sale endpoint with amount only', async () => {
      mockPost.mockResolvedValue({
        data: {
          id: 1,
          transactionId: 'tx-stored',
          transactionSuccess: true,
          transactionResult: 'APPROVED',
          transactionMessage: '',
          transactionTime: Date.now(),
          transactionType: 'SALE',
          amount: 25,
        },
        status: 200,
        statusText: 'OK',
      });

      await service.createSale({
        amount: 25,
        currency: 'CAD',
        customerLookupId: 'cust-1',
        cardLookupId: 'card-1',
      });

      expect(mockPost).toHaveBeenCalledWith(
        '/sale/customer/cust-1/card/card-1',
        { amount: 25 },
        expect.any(Object)
      );
    });

    it('encodes customer and card lookup IDs used in sale path', async () => {
      mockPost.mockResolvedValue({
        data: {
          id: 1,
          transactionType: 'SALE',
          transactionSuccess: true,
          transactionResult: 'APPROVED',
          transactionMessage: '',
          transactionTime: Date.now(),
          amount: 25,
        },
        status: 200,
        statusText: 'OK',
      });

      await service.createSale({
        amount: 25,
        currency: 'CAD',
        customerLookupId: 'cust/1',
        cardLookupId: 'card?1',
      });

      expect(mockPost).toHaveBeenCalledWith(
        '/sale/customer/cust%2F1/card/card%3F1',
        { amount: 25 },
        expect.any(Object)
      );
    });

    it('routes createSale with customerLookupId and new card to customer sale endpoint with card fields', async () => {
      mockPost.mockResolvedValue({
        data: {
          id: 1,
          transactionId: 'tx-newcard',
          transactionSuccess: true,
          transactionResult: 'APPROVED',
          transactionMessage: '',
          transactionTime: Date.now(),
          transactionType: 'SALE',
          amount: 25,
        },
        status: 200,
        statusText: 'OK',
      });
      const testPanChunk1 = '4111';
      const testPanChunk2 = '1111';
      const testPanChunk3 = '11111111';
      const testPan = testPanChunk1 + testPanChunk2 + testPanChunk3;

      await service.createSale({
        amount: 25,
        currency: 'CAD',
        customerLookupId: 'cust-1',
        card: {
          cardNumber: testPan,
          cardExpiryMonth: 12,
          cardExpiryYear: 25,
          cvv2: '123',
        },
      });

      expect(mockPost).toHaveBeenCalledWith(
        '/sale/customer/cust-1',
        expect.objectContaining({
          amount: 25,
          currency: 'CAD',
          cardNumber: testPan,
          cardExpiryMonth: 12,
          cardExpiryYear: 25,
          cvv2: '123',
        }),
        expect.any(Object)
      );
    });

    it('rejects createSale when cardLookupId is set without customerLookupId', async () => {
      await expect(
        service.createSale({
          amount: 25,
          currency: 'CAD',
          cardLookupId: 'card-1',
        })
      ).rejects.toThrow(/cardLookupId requires customerLookupId/);
      expect(mockPost).not.toHaveBeenCalled();
    });

    it('rejects createSale when both card and token are provided', async () => {
      const testPanChunk1 = '4111';
      const testPanChunk2 = '1111';
      const testPanChunk3 = '11111111';
      const testPan = testPanChunk1 + testPanChunk2 + testPanChunk3;

      await expect(
        service.createSale({
          amount: 25,
          currency: 'CAD',
          card: {
            cardNumber: testPan,
            cardExpiryMonth: 12,
            cardExpiryYear: 25,
            cvv2: '123',
          },
          token: 'encrypted-token',
        })
      ).rejects.toThrow(/both card and token/);
      expect(mockPost).not.toHaveBeenCalled();
    });

    it('rejects createSale when cardLookupId is combined with card', async () => {
      const testPanChunk1 = '4111';
      const testPanChunk2 = '1111';
      const testPanChunk3 = '11111111';
      const testPan = testPanChunk1 + testPanChunk2 + testPanChunk3;

      await expect(
        service.createSale({
          amount: 25,
          currency: 'CAD',
          customerLookupId: 'cust-1',
          cardLookupId: 'card-1',
          card: {
            cardNumber: testPan,
            cardExpiryMonth: 12,
            cardExpiryYear: 25,
            cvv2: '123',
          },
        })
      ).rejects.toThrow(/cardLookupId cannot be combined with card or token/);
      expect(mockPost).not.toHaveBeenCalled();
    });

    it('rejects createSale without customerLookupId when neither card nor token is provided', async () => {
      await expect(
        service.createSale({
          amount: 25,
          currency: 'CAD',
        })
      ).rejects.toThrow(/either card or token/);
      expect(mockPost).not.toHaveBeenCalled();
    });
  });

  describe('createAuthorization customer profile routing', () => {
    it('routes createAuthorization with customerLookupId and no card/token to default-card authorize endpoint with amount only', async () => {
      mockPost.mockResolvedValue({
        data: {
          id: 1,
          transactionType: 'AUTHORIZATION',
          transactionSuccess: true,
          transactionResult: 'APPROVED',
          transactionMessage: '',
          transactionTime: Date.now(),
          amount: 30,
        },
        status: 200,
        statusText: 'OK',
      });

      await service.createAuthorization({
        amount: 30,
        currency: 'CAD',
        customerLookupId: 'cust-1',
      });

      expect(mockPost).toHaveBeenCalledWith(
        '/authorize/customer/cust-1',
        { amount: 30 },
        expect.any(Object)
      );
    });

    it('routes createAuthorization with customerLookupId and cardLookupId to stored-card authorize endpoint with amount only', async () => {
      mockPost.mockResolvedValue({
        data: {
          id: 1,
          transactionType: 'AUTHORIZATION',
          transactionSuccess: true,
          transactionResult: 'APPROVED',
          transactionMessage: '',
          transactionTime: Date.now(),
          amount: 30,
        },
        status: 200,
        statusText: 'OK',
      });

      await service.createAuthorization({
        amount: 30,
        currency: 'CAD',
        customerLookupId: 'cust-1',
        cardLookupId: 'card-1',
      });

      expect(mockPost).toHaveBeenCalledWith(
        '/authorize/customer/cust-1/card/card-1',
        { amount: 30 },
        expect.any(Object)
      );
    });

    it('rejects createAuthorization without customerLookupId when neither card nor token is provided', async () => {
      await expect(
        service.createAuthorization({
          amount: 30,
          currency: 'CAD',
        })
      ).rejects.toThrow(/either card or token/);
      expect(mockPost).not.toHaveBeenCalled();
    });

    it('routes createAuthorization with customerLookupId and new card to customer authorize endpoint with card fields', async () => {
      mockPost.mockResolvedValue({
        data: {
          id: 1,
          transactionType: 'AUTHORIZATION',
          transactionSuccess: true,
          transactionResult: 'APPROVED',
          transactionMessage: '',
          transactionTime: Date.now(),
          amount: 30,
        },
        status: 200,
        statusText: 'OK',
      });
      const testPanChunk1 = '4111';
      const testPanChunk2 = '1111';
      const testPanChunk3 = '11111111';
      const testPan = testPanChunk1 + testPanChunk2 + testPanChunk3;

      await service.createAuthorization({
        amount: 30,
        currency: 'CAD',
        customerLookupId: 'cust-1',
        card: {
          cardNumber: testPan,
          cardExpiryMonth: 12,
          cardExpiryYear: 25,
          cvv2: '123',
        },
      });

      expect(mockPost).toHaveBeenCalledWith(
        '/authorize/customer/cust-1',
        expect.objectContaining({
          amount: 30,
          currency: 'CAD',
          cardNumber: testPan,
          cardExpiryMonth: 12,
          cardExpiryYear: 25,
          cvv2: '123',
        }),
        expect.any(Object)
      );
    });
  });

  describe('listTransactions', () => {
    it('calls GET /transaction with transformed query params', async () => {
      mockGet.mockResolvedValue({
        data: { entities: [], paging: { cursors: { after: 'abc' } } },
        status: 200,
        statusText: 'OK',
      });

      await service.listTransactions({
        limit: 25,
        before: 'c1',
        after: 'c2',
        fromDate: '2026-01-01',
        toDate: '2026-01-31',
        status: ['APPROVED', 'DECLINED'],
        channel: ['MOBILE', 'CARD_TERMINAL'],
        amountMin: 1,
        amountMax: 100,
        email: 'test@example.com',
        firstName: 'Jane',
        lastName: 'Doe',
      });

      expect(mockGet).toHaveBeenCalledWith(
        '/transaction',
        expect.objectContaining({
          params: expect.objectContaining({
            limit: 25,
            before: 'c1',
            after: 'c2',
            from_date: '2026-01-01',
            to_date: '2026-01-31',
            transaction_status: 'APPROVED,DECLINED',
            channel: 'MOBILE,CARD_TERMINAL',
            min_amount: 1,
            max_amount: 100,
            email_address: 'test@example.com',
            first_name: 'Jane',
            last_name: 'Doe',
          }),
        })
      );
      expect(mockGet.mock.calls[0][1].params).not.toHaveProperty('test_mode');
    });
  });

  describe('listUserTransactions', () => {
    it('calls GET /transaction/user with transformed query params', async () => {
      mockGet.mockResolvedValue({
        data: { entities: [], paging: { cursors: { after: 'abc' } } },
        status: 200,
        statusText: 'OK',
      });

      const result = await service.listUserTransactions({
        limit: 25,
        fromDate: '2026-01-01',
        toDate: '2026-01-31',
        status: 'APPROVED',
        channel: 'MOBILE',
        amountMin: 1,
        amountMax: 100,
        email: 'test@example.com',
        firstName: 'Jane',
        lastName: 'Doe',
      });

      expect(mockGet).toHaveBeenCalledWith(
        '/transaction/user',
        expect.objectContaining({
          params: expect.objectContaining({
            limit: 25,
            from_date: '2026-01-01',
            to_date: '2026-01-31',
            transaction_status: 'APPROVED',
            channel: 'MOBILE',
            min_amount: 1,
            max_amount: 100,
            email_address: 'test@example.com',
            first_name: 'Jane',
            last_name: 'Doe',
          }),
        })
      );
      expect(result.entities).toEqual([]);
      expect(result.paging).toEqual({ cursors: { after: 'abc' } });
    });
  });

  describe('getTransaction', () => {
    it('calls GET /transaction/{id}', async () => {
      mockGet.mockResolvedValue({
        data: {
          id: 1,
          transactionId: 'tx-1',
          transactionType: 'SALE',
          transactionSuccess: true,
          transactionResult: 'APPROVED',
          transactionMessage: '',
          transactionTime: Date.now(),
          amount: 100,
        },
        status: 200,
        statusText: 'OK',
      });

      const result = await service.getTransaction(1);

      expect(mockGet).toHaveBeenCalledWith(
        '/transaction/1',
        expect.any(Object)
      );
      expect(result.id).toBe(1);
      expect(result.amount).toBe(100);
    });

    it('encodes transaction id in URL path', async () => {
      mockGet.mockResolvedValue({
        data: {
          id: 1,
          transactionId: 'tx-1',
          transactionType: 'SALE',
          transactionSuccess: true,
          transactionResult: 'APPROVED',
          transactionMessage: '',
          transactionTime: Date.now(),
          amount: 100,
        },
        status: 200,
        statusText: 'OK',
      });

      await service.getTransaction('tx/1?x=1');

      expect(mockGet).toHaveBeenCalledWith(
        '/transaction/tx%2F1%3Fx%3D1',
        expect.any(Object)
      );
    });
  });

  describe('captureTransaction', () => {
    it('calls POST /capture/{id} with capture body', async () => {
      mockPost.mockResolvedValue({
        data: {
          id: 2,
          transactionId: 'tx-2',
          transactionType: 'CAPTURE',
          transactionSuccess: true,
          transactionResult: 'APPROVED',
          transactionMessage: '',
          transactionTime: Date.now(),
          amount: 50,
        },
        status: 200,
        statusText: 'OK',
      });

      await service.captureTransaction('tx/1?x=1', { amount: 50 });

      expect(mockPost).toHaveBeenCalledWith(
        '/capture/tx%2F1%3Fx%3D1',
        { amount: 50 },
        expect.any(Object)
      );
    });
  });

  describe('refundTransaction', () => {
    it('calls POST /refund/{id} with refund body', async () => {
      mockPost.mockResolvedValue({
        data: {
          id: 3,
          transactionId: 'tx-3',
          transactionType: 'REFUND',
          transactionSuccess: true,
          transactionResult: 'APPROVED',
          transactionMessage: '',
          transactionTime: Date.now(),
          amount: 25,
        },
        status: 200,
        statusText: 'OK',
      });

      await service.refundTransaction('tx/1?x=1', { amount: 25 });

      expect(mockPost).toHaveBeenCalledWith(
        '/refund/tx%2F1%3Fx%3D1',
        { amount: 25 },
        expect.any(Object)
      );
    });
  });
});
