/**
 * Customer service for managing customers, cards, and subscriptions
 */

import { HttpClient, createApiClient, withAuth } from '../utils/apiClient';
import { stripBearerToken } from '../utils/stripBearerToken';
import { AuthService } from './AuthService';
import { Environment, PayHQSDKConfig } from '../types/common';
import {
  Customer,
  CreateCustomerRequest,
  UpdateCustomerRequest,
  CustomerSearchParams,
  CustomerListResponse,
  Card,
  CardRequest,
  UpdateCardRequest,
  Subscription,
  CreateSubscriptionRequest,
  UpdateSubscriptionRequest,
} from '../types/customer';
import { ErrorFactory, PayHQError } from '../types/errors';
import { sanitizeApiErrorResponseDetails } from '../utils/redactForDebugLog';

/**
 * Customer service for managing customers, cards, and subscriptions
 */
export class CustomerService {
  private httpClient: HttpClient;
  private authService: AuthService;

  /**
   * Create a customer service client backed by authenticated API requests.
   */
  constructor(
    config: PayHQSDKConfig,
    environment: Environment,
    authService: AuthService
  ) {
    this.authService = authService;

    this.httpClient = createApiClient(
      config,
      environment,
      `${environment.gatewayUrl}/customer-service`
    );
  }

  /**
   * Helper method to make authenticated HTTP requests
   */
  private async makeAuthenticatedRequest<T>(
    method: 'get' | 'post' | 'put' | 'patch' | 'delete',
    url: string,
    data?: any,
    config?: any
  ): Promise<{ data: T; status: number; statusText: string }> {
    try {
      const authHeader = await this.authService.getAuthHeader();
      const authConfig = withAuth(
        config || {},
        stripBearerToken(authHeader.Authorization)
      );

      switch (method) {
        case 'get':
          return await this.httpClient.get<T>(url, authConfig);
        case 'post':
          return await this.httpClient.post<T>(url, data, authConfig);
        case 'put':
          return await this.httpClient.put<T>(url, data, authConfig);
        case 'patch':
          return await this.httpClient.patch<T>(url, data, authConfig);
        case 'delete':
          return await this.httpClient.delete<T>(url, authConfig);
        default:
          throw new Error(`Unsupported HTTP method: ${method}`);
      }
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Customer Management

  /**
   * Create a new customer
   */
  async createCustomer(request: CreateCustomerRequest): Promise<Customer> {
    const response = await this.makeAuthenticatedRequest<Customer>(
      'post',
      '/customer',
      request
    );
    return response.data;
  }

  /**
   * Retrieve a specific customer by lookup ID
   */
  async getCustomer(customerLookupId: string): Promise<Customer> {
    const response = await this.makeAuthenticatedRequest<Customer>(
      'get',
      `/customer/${encodeURIComponent(customerLookupId)}`
    );
    return response.data;
  }

  /**
   * Update a customer
   */
  async updateCustomer(
    customerLookupId: string,
    request: UpdateCustomerRequest
  ): Promise<Customer> {
    const response = await this.makeAuthenticatedRequest<Customer>(
      'put',
      `/customer/${encodeURIComponent(customerLookupId)}`,
      request
    );
    return response.data;
  }

  /**
   * List all customers with optional filtering
   */
  async listCustomers(
    params?: CustomerSearchParams
  ): Promise<CustomerListResponse> {
    const response = await this.makeAuthenticatedRequest<any>(
      'get',
      '/customer',
      undefined,
      { params: this.transformCustomerSearchParams(params) }
    );

    return this.normalizeCustomerListResponse(response.data);
  }

  /**
   * Get customers for a specific plan
   */
  async getCustomersByPlan(
    planLookupId: string,
    params?: CustomerSearchParams
  ): Promise<CustomerListResponse> {
    const response = await this.makeAuthenticatedRequest<CustomerListResponse>(
      'get',
      `/customer/plan/${encodeURIComponent(planLookupId)}`,
      undefined,
      { params: this.transformCustomerSearchParams(params) }
    );
    return this.normalizeCustomerListResponse(response.data);
  }

  private transformCustomerSearchParams(
    params?: CustomerSearchParams
  ): Record<string, unknown> | undefined {
    if (!params) {
      return undefined;
    }

    const apiParams: Record<string, string | number | boolean> = {};

    if (params.limit !== undefined) apiParams['limit'] = params.limit;
    if (params.before !== undefined) apiParams['before'] = params.before;
    if (params.after !== undefined) apiParams['after'] = params.after;
    if (params.emailAddress !== undefined) {
      apiParams['email_address'] = params.emailAddress;
    }
    if (params.firstName !== undefined) {
      apiParams['first_name'] = params.firstName;
    }
    if (params.lastName !== undefined) {
      apiParams['last_name'] = params.lastName;
    }
    if (params.company !== undefined) apiParams['company'] = params.company;
    if (params.withSubscription !== undefined) {
      apiParams['with_subscription'] = params.withSubscription;
    }

    return apiParams;
  }

  private normalizeCustomerListResponse(data: any): CustomerListResponse {
    let entities: Customer[] = [];
    let paging: any = undefined;

    if (Array.isArray(data)) {
      entities = data;
    } else if (data?.entities && Array.isArray(data.entities)) {
      entities = data.entities;
      paging = data.paging;
    } else if (data?.customers && Array.isArray(data.customers)) {
      entities = data.customers;
      paging = data.paging;
    }

    if (paging?.cursor && !paging.cursors) {
      paging = { ...paging, cursors: paging.cursor };
    }

    return { entities, paging };
  }

  // Card Management

  /**
   * Add a new card to a customer
   */
  async addCard(
    customerLookupId: string,
    request: CardRequest
  ): Promise<Customer> {
    const response = await this.makeAuthenticatedRequest<Customer>(
      'post',
      `/customer/${encodeURIComponent(customerLookupId)}/card`,
      request
    );
    return response.data;
  }

  /**
   * Update a card
   */
  async updateCard(
    customerLookupId: string,
    cardLookupId: string,
    request: UpdateCardRequest
  ): Promise<Customer> {
    const response = await this.makeAuthenticatedRequest<Customer>(
      'patch',
      `/customer/${encodeURIComponent(customerLookupId)}/card/${encodeURIComponent(cardLookupId)}`,
      request
    );
    return response.data;
  }

  /**
   * Remove a card from a customer
   */
  async removeCard(
    customerLookupId: string,
    cardLookupId: string
  ): Promise<Customer> {
    const response = await this.makeAuthenticatedRequest<Customer>(
      'delete',
      `/customer/${encodeURIComponent(customerLookupId)}/card/${encodeURIComponent(cardLookupId)}`
    );
    return response.data;
  }

  // Subscription Management

  /**
   * Create a new subscription for a customer
   */
  async createSubscription(
    customerLookupId: string,
    request: CreateSubscriptionRequest
  ): Promise<Customer> {
    const response = await this.makeAuthenticatedRequest<Customer>(
      'post',
      `/customer/${encodeURIComponent(customerLookupId)}/subscription`,
      request
    );
    return response.data;
  }

  /**
   * Update a subscription
   */
  async updateSubscription(
    customerLookupId: string,
    subscriptionLookupId: string,
    request: UpdateSubscriptionRequest
  ): Promise<Customer> {
    const response = await this.makeAuthenticatedRequest<Customer>(
      'patch',
      `/customer/${encodeURIComponent(customerLookupId)}/subscription/${encodeURIComponent(subscriptionLookupId)}`,
      request
    );
    return response.data;
  }

  /**
   * Cancel a subscription
   */
  async cancelSubscription(
    customerLookupId: string,
    subscriptionLookupId: string
  ): Promise<Customer> {
    const response = await this.makeAuthenticatedRequest<Customer>(
      'patch',
      `/customer/${encodeURIComponent(customerLookupId)}/subscription/${encodeURIComponent(subscriptionLookupId)}`,
      { status: 'CANCELED' }
    );
    return response.data;
  }

  /**
   * List all subscriptions for a customer
   */
  async listSubscriptions(customerLookupId: string): Promise<Subscription[]> {
    const customer = await this.getCustomer(customerLookupId);
    return customer.subscriptions || [];
  }

  // Utility Methods

  /**
   * Search customers by email
   */
  async searchCustomersByEmail(email: string): Promise<Customer[]> {
    const response = await this.listCustomers({ emailAddress: email });
    return response.entities || [];
  }

  /**
   * Search customers by name
   */
  async searchCustomersByName(
    firstName?: string,
    lastName?: string
  ): Promise<Customer[]> {
    const params: CustomerSearchParams = {};
    if (firstName) params.firstName = firstName;
    if (lastName) params.lastName = lastName;

    const response = await this.listCustomers(params);
    return response.entities || [];
  }

  /**
   * Get customers with active subscriptions
   */
  async getCustomersWithSubscriptions(): Promise<Customer[]> {
    const response = await this.listCustomers({ withSubscription: true });
    return response.entities || [];
  }

  /**
   * Get default card for a customer
   */
  async getDefaultCard(customerLookupId: string): Promise<Card | null> {
    const customer = await this.getCustomer(customerLookupId);
    if (!customer.cards || customer.cards.length === 0) {
      return null;
    }
    return customer.cards.find(card => card.isDefault) || null;
  }

  /**
   * Set a card as default
   */
  async setDefaultCard(
    customerLookupId: string,
    cardLookupId: string
  ): Promise<Card> {
    const customer = await this.updateCard(customerLookupId, cardLookupId, {
      isDefault: true,
    });
    const updatedCard = customer.cards.find(
      card => card.lookupId === cardLookupId
    );
    if (!updatedCard) {
      throw new Error('Card not found after update');
    }
    return updatedCard;
  }

  /**
   * Check if customer exists
   */
  async customerExists(customerLookupId: string): Promise<boolean> {
    try {
      await this.getCustomer(customerLookupId);
      return true;
    } catch (error: any) {
      if (error.statusCode === 404) {
        return false;
      }
      throw error;
    }
  }

  /**
   * Handle API errors
   */
  private handleError(error: any): PayHQError {
    const transportError = ErrorFactory.fromFetchTransportError(error);
    if (transportError) {
      return transportError;
    }

    if (error.response) {
      const { status, data } = error.response;
      const requestId = error.response.headers?.['x-request-id'];
      const sanitizedDetails = sanitizeApiErrorResponseDetails(data);

      if (data?.error) {
        return ErrorFactory.fromApiResponse(
          {
            code: data.error,
            message: data.message || 'Customer service error',
            status,
            details: sanitizedDetails,
            request_id: requestId,
          },
          error
        );
      }

      return ErrorFactory.fromApiResponse(
        {
          code: 'API_ERROR',
          message: `Customer service error: ${status}`,
          status,
          details: sanitizedDetails,
          request_id: requestId,
        },
        error
      );
    }

    if (error.request) {
      return ErrorFactory.networkError(
        'Network error in customer service',
        error
      );
    }

    return ErrorFactory.fromApiResponse(
      {
        code: 'UNKNOWN_ERROR',
        message: 'Unknown error in customer service',
      },
      error
    );
  }
}
