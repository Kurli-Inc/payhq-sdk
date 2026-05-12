/**
 * Unit tests for CustomerService (mocked HTTP and Auth)
 */

import { CustomerService } from '../../src/services/CustomerService';
import type { Environment, PayHQSDKConfig } from '../../src/types/common';
import type { Customer, CreateCustomerRequest } from '../../src/types/customer';

const mockGet = jest.fn();
const mockPost = jest.fn();
const mockPut = jest.fn();
const mockPatch = jest.fn();
const mockDelete = jest.fn();

jest.mock('../../src/utils/apiClient', () => ({
  createApiClient: () => ({
    get: mockGet,
    post: mockPost,
    put: mockPut,
    patch: mockPatch,
    delete: mockDelete,
  }),
  createAuthClient: jest.fn(),
  withAuth: jest.fn((config: any = {}, token: string) => ({
    ...config,
    headers: {
      ...(config.headers || {}),
      Authorization: `Bearer ${token}`,
    },
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

describe('CustomerService (unit)', () => {
  let service: CustomerService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthService.getAuthHeader.mockResolvedValue({
      Authorization: 'Bearer fake-token',
    });
    service = new CustomerService(config, environment, mockAuthService as any);
  });

  describe('getCustomer', () => {
    it('calls GET /customer/{lookupId} and returns customer', async () => {
      const fakeCustomer: Customer = {
        id: 1,
        lookupId: 'cust-123',
        email: 'j@example.com',
        firstName: 'Jane',
        lastName: 'Doe',
        cards: [],
        subscriptions: [],
      };
      mockGet.mockResolvedValue({
        data: { ...fakeCustomer },
        status: 200,
        statusText: 'OK',
      });

      const result = await service.getCustomer('cust-123');

      expect(mockGet).toHaveBeenCalledWith(
        '/customer/cust-123',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: expect.stringMatching(/^Bearer\s+[^ ]+$/),
          }),
        })
      );
      expect(result.lookupId).toBe('cust-123');
      expect(result.email).toBe('j@example.com');
    });
  });

  describe('createCustomer', () => {
    it('calls POST /customer with request body', async () => {
      const request: CreateCustomerRequest = {
        email: 'new@example.com',
        firstName: 'New',
        lastName: 'User',
      };
      mockPost.mockResolvedValue({
        data: {
          id: 2,
          lookupId: 'cust-456',
          email: request.email,
          firstName: request.firstName,
          lastName: request.lastName,
          cards: [],
          subscriptions: [],
        },
        status: 200,
        statusText: 'OK',
      });

      const result = await service.createCustomer(request);

      expect(mockPost).toHaveBeenCalledWith(
        '/customer',
        request,
        expect.any(Object)
      );
      expect(result.email).toBe(request.email);
      expect(result.lookupId).toBe('cust-456');
    });
  });

  describe('updateCustomer', () => {
    it('calls PUT /customer/{lookupId} with body', async () => {
      mockPut.mockResolvedValue({
        data: {
          id: 1,
          lookupId: 'cust-123',
          email: 'updated@example.com',
          firstName: 'Updated',
          lastName: 'Name',
          cards: [],
          subscriptions: [],
        },
        status: 200,
        statusText: 'OK',
      });

      await service.updateCustomer('cust-123', {
        email: 'updated@example.com',
        firstName: 'Updated',
      });

      expect(mockPut).toHaveBeenCalledWith(
        '/customer/cust-123',
        expect.objectContaining({ email: 'updated@example.com' }),
        expect.any(Object)
      );
    });
  });

  describe('createSubscription', () => {
    it('calls POST /customer/{lookupId}/subscription and returns updated customer', async () => {
      const startDate = Date.now() + 86_400_000;
      mockPost.mockResolvedValue({
        data: {
          id: 1,
          lookupId: 'cust-1',
          email: 'user@example.com',
          firstName: 'U',
          lastName: 'Ser',
          cards: [],
          subscriptions: [
            {
              id: 99,
              lookupId: 'sub-1',
              planId: 1,
              planLookupId: 'plan-1',
              name: 'Plan',
              status: 'ACTIVE',
              amount: 10.99,
              currency: 'CAD',
              frequency: 'MONTHLY',
            },
          ],
        },
        status: 200,
        statusText: 'OK',
      });

      const result = await service.createSubscription('cust-1', {
        planLookupId: 'plan-1',
        cardLookupId: 'card-1',
        startDate,
        amount: 10.99,
      });

      expect(mockPost).toHaveBeenCalledWith(
        '/customer/cust-1/subscription',
        expect.objectContaining({
          planLookupId: 'plan-1',
          cardLookupId: 'card-1',
          startDate,
          amount: 10.99,
        }),
        expect.any(Object)
      );
      expect(result.lookupId).toBe('cust-1');
      expect(result.subscriptions).toHaveLength(1);
      expect(result.subscriptions[0]!.lookupId).toBe('sub-1');
    });
  });

  describe('cancelSubscription', () => {
    it('uses docs-aligned CANCELED status payload', async () => {
      mockPatch.mockResolvedValue({
        data: {
          id: 1,
          lookupId: 'cust-1',
          email: 'user@example.com',
          firstName: 'U',
          lastName: 'Ser',
          cards: [],
          subscriptions: [],
        },
        status: 200,
        statusText: 'OK',
      });

      await service.cancelSubscription('cust-1', 'sub-1');

      expect(mockPatch).toHaveBeenCalledWith(
        '/customer/cust-1/subscription/sub-1',
        { status: 'CANCELED' },
        expect.any(Object)
      );
    });
  });

  describe('getCustomersByPlan', () => {
    it('calls GET /customer/plan/{planLookupId} with params', async () => {
      mockGet.mockResolvedValue({
        data: {
          entities: [],
          paging: { cursors: { before: 'a', after: 'b' } },
        },
        status: 200,
        statusText: 'OK',
      });

      await service.getCustomersByPlan('plan-1', {
        limit: 10,
        company: 'Acme',
        emailAddress: 'test@example.com',
        firstName: 'Jane',
      });

      expect(mockGet).toHaveBeenCalledWith(
        '/customer/plan/plan-1',
        expect.objectContaining({
          params: {
            limit: 10,
            company: 'Acme',
            email_address: 'test@example.com',
            first_name: 'Jane',
          },
        })
      );
    });

    it('normalizes customers payload and paging.cursor shape', async () => {
      mockGet.mockResolvedValue({
        data: {
          customers: [],
          paging: { cursor: { before: 'a', after: 'b' } },
        },
        status: 200,
        statusText: 'OK',
      });

      const result = await service.getCustomersByPlan('plan-1');

      expect(result).toEqual({
        entities: [],
        paging: {
          cursor: {
            before: 'a',
            after: 'b',
          },
          cursors: {
            before: 'a',
            after: 'b',
          },
        },
      });
    });
  });

  describe('updateSubscription', () => {
    it('calls PATCH /customer/{id}/subscription/{id} with payload', async () => {
      mockPatch.mockResolvedValue({
        data: {
          id: 1,
          lookupId: 'cust-1',
          email: 'user@example.com',
          firstName: 'U',
          lastName: 'Ser',
          cards: [],
          subscriptions: [],
        },
        status: 200,
        statusText: 'OK',
      });

      await service.updateSubscription('cust-1', 'sub-1', {
        amount: 15.5,
        status: 'PAUSED',
      });

      expect(mockPatch).toHaveBeenCalledWith(
        '/customer/cust-1/subscription/sub-1',
        { amount: 15.5, status: 'PAUSED' },
        expect.any(Object)
      );
    });
  });

  describe('listCustomers', () => {
    it('calls GET /customer with transformed query params', async () => {
      mockGet.mockResolvedValue({
        data: { entities: [], paging: { cursors: { after: 'abc' } } },
        status: 200,
        statusText: 'OK',
      });

      await service.listCustomers({
        limit: 10,
        emailAddress: 'test@example.com',
        firstName: 'Jane',
        lastName: 'Doe',
        withSubscription: true,
      });

      expect(mockGet).toHaveBeenCalledWith(
        '/customer',
        expect.objectContaining({
          params: {
            limit: 10,
            email_address: 'test@example.com',
            first_name: 'Jane',
            last_name: 'Doe',
            with_subscription: true,
          },
        })
      );
    });
  });

  describe('card management', () => {
    it('calls POST /customer/{lookupId}/card with card request', async () => {
      mockPost.mockResolvedValue({
        data: {
          id: 1,
          lookupId: 'cust-1',
          email: 'user@example.com',
          firstName: 'U',
          lastName: 'Ser',
          cards: [],
          subscriptions: [],
        },
        status: 200,
        statusText: 'OK',
      });

      await service.addCard('cust-1', {
        cardNumber: '4111111111111111',
        cardExpiryMonth: 12,
        cardExpiryYear: 25,
        cvv2: '123',
      });

      expect(mockPost).toHaveBeenCalledWith(
        '/customer/cust-1/card',
        expect.objectContaining({
          cardNumber: '4111111111111111',
          cardExpiryMonth: 12,
          cardExpiryYear: 25,
          cvv2: '123',
        }),
        expect.any(Object)
      );
    });

    it('calls PATCH /customer/{lookupId}/card/{cardLookupId} with update body', async () => {
      mockPatch.mockResolvedValue({
        data: {
          id: 1,
          lookupId: 'cust-1',
          email: 'user@example.com',
          firstName: 'U',
          lastName: 'Ser',
          cards: [],
          subscriptions: [],
        },
        status: 200,
        statusText: 'OK',
      });

      await service.updateCard('cust-1', 'card-1', { isDefault: true });

      expect(mockPatch).toHaveBeenCalledWith(
        '/customer/cust-1/card/card-1',
        { isDefault: true },
        expect.any(Object)
      );
    });

    it('calls DELETE /customer/{lookupId}/card/{cardLookupId}', async () => {
      mockDelete.mockResolvedValue({
        data: {
          id: 1,
          lookupId: 'cust-1',
          email: 'user@example.com',
          firstName: 'U',
          lastName: 'Ser',
          cards: [],
          subscriptions: [],
        },
        status: 200,
        statusText: 'OK',
      });

      await service.removeCard('cust-1', 'card-1');

      expect(mockDelete).toHaveBeenCalledWith(
        '/customer/cust-1/card/card-1',
        expect.any(Object)
      );
    });
  });
});
