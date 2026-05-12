/**
 * Terminal service for card terminal integration
 * Implements only the endpoints documented in PAYHQ Terminals API documentation
 */

import { HttpClient, createApiClient, withAuth } from '../utils/apiClient';
import { stripBearerToken } from '../utils/stripBearerToken';
import { AuthService } from './AuthService';
import {
  Currency,
  Environment,
  PayHQSDKConfig,
  PAYHQ_DEFAULT_TERMINAL_TIMEOUT_MS,
} from '../types/common';
import {
  TerminalTransaction,
  TerminalSaleRequest,
  TerminalSaleWithCustomerRequest,
  TerminalRefundRequest,
  TerminalAuthorizationRequest,
  TerminalCaptureRequest,
} from '../types/terminal';
import { ErrorFactory, PayHQError } from '../types/errors';
import { sanitizeApiErrorResponseDetails } from '../utils/redactForDebugLog';

/**
 * Terminal service for card terminal integration
 * Only implements documented PAYHQ Terminal API endpoints
 */
export class TerminalService {
  private httpClient: HttpClient;
  private authService: AuthService;

  /**
   * Create a terminal service client for card-present transaction endpoints.
   */
  constructor(
    config: PayHQSDKConfig,
    environment: Environment,
    authService: AuthService
  ) {
    this.authService = authService;

    const resolvedTimeout =
      config.terminalTimeout ??
      config.timeout ??
      PAYHQ_DEFAULT_TERMINAL_TIMEOUT_MS;
    const terminalClientConfig: PayHQSDKConfig = {
      ...config,
      timeout: resolvedTimeout,
    };

    this.httpClient = createApiClient(
      terminalClientConfig,
      environment,
      `${environment.gatewayUrl}/transaction-service-vt`
    );
  }

  /**
   * Helper method to make authenticated HTTP requests
   */
  private async makeAuthenticatedRequest<T>(
    method: 'get' | 'post' | 'put' | 'delete',
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
        case 'delete':
          return await this.httpClient.delete<T>(url, authConfig);
        default:
          throw new Error(`Unsupported HTTP method: ${method}`);
      }
    } catch (error) {
      throw this.handleError(error);
    }
  }

  private buildBaseTerminalRequest(request: {
    amount: number;
    currency: Currency;
    processorId: number;
  }) {
    return {
      amount: request.amount,
      currency: request.currency,
      is_card_terminal_transaction: true,
      processor_id: request.processorId,
    };
  }

  /**
   * Process a sale using a customer lookup ID.
   * Endpoint: POST /sale/terminalcustomer/{customer_lookup_id}
   */
  async saleWithCustomer(
    request: TerminalSaleWithCustomerRequest
  ): Promise<TerminalTransaction> {
    const terminalRequest = {
      ...this.buildBaseTerminalRequest(request),
      first_name: request.firstName ?? '',
      last_name: request.lastName ?? '',
      company: request.company ?? '',
      order_id: request.orderId ?? '',
      invoice_id: request.invoiceId ?? '',
      description: request.description ?? '',
      email: request.email ?? '',
      card_expiry_month: '/',
      card_expiry_year: '',
      card_number: '',
    };

    const response = await this.makeAuthenticatedRequest<TerminalTransaction>(
      'post',
      `/sale/terminalcustomer/${encodeURIComponent(request.customerLookupId)}`,
      terminalRequest
    );
    return response.data;
  }

  /**
   * Process a sale without a customer lookup.
   * Endpoint: POST /sale/terminal
   */
  async sale(request: TerminalSaleRequest): Promise<TerminalTransaction> {
    const terminalRequest = {
      ...this.buildBaseTerminalRequest(request),
      first_name: request.firstName ?? '',
      last_name: request.lastName ?? '',
      company: request.company ?? '',
      bcc_emails: null,
      telephone: request.telephone ?? '',
      address1: request.address1 ?? '',
      address2: request.address2 ?? '',
      city: request.city ?? '',
      province: request.province ?? '',
      country: request.country ?? '',
      postal_code: request.postalCode ?? '',
      order_id: request.orderId ?? '',
      invoice_id: request.invoiceId ?? '',
      description: request.description ?? '',
      card_expiry_month: '/',
      card_expiry_year: '',
      card_number: '',
    };

    const response = await this.makeAuthenticatedRequest<TerminalTransaction>(
      'post',
      '/sale/terminal',
      terminalRequest
    );
    return response.data;
  }

  /**
   * Process a refund for a prior transaction.
   * Endpoint: POST /refund/{transaction_id}
   */
  async refund(request: TerminalRefundRequest): Promise<TerminalTransaction> {
    const terminalRequest = {
      ...this.buildBaseTerminalRequest(request),
      first_name: request.firstName ?? '',
      last_name: request.lastName ?? '',
      company: request.company ?? '',
      invoice_id: request.invoiceId ?? '',
      email: request.email ?? '',
    };

    const response = await this.makeAuthenticatedRequest<TerminalTransaction>(
      'post',
      `/refund/${encodeURIComponent(request.originalTransactionId)}`,
      terminalRequest
    );
    return response.data;
  }

  /**
   * Authorize a card and place funds on hold.
   * Endpoint: POST /authorize/terminal
   */
  async authorize(
    request: TerminalAuthorizationRequest
  ): Promise<TerminalTransaction> {
    const terminalRequest = {
      ...this.buildBaseTerminalRequest(request),
      first_name: request.firstName ?? '',
      last_name: request.lastName ?? '',
      company: request.company ?? '',
      order_id: request.orderId ?? '',
      invoice_id: request.invoiceId ?? '',
      description: request.description ?? '',
      email: request.email ?? '',
      card_expiry_month: '/',
      card_expiry_year: '',
      card_number: '',
    };

    const response = await this.makeAuthenticatedRequest<TerminalTransaction>(
      'post',
      '/authorize/terminal',
      terminalRequest
    );
    return response.data;
  }

  /**
   * Capture a previous terminal authorization.
   * Endpoint: POST /capture/{transaction_id}
   */
  async capture(
    transactionId: string,
    request: TerminalCaptureRequest
  ): Promise<TerminalTransaction> {
    const terminalRequest = {
      ...this.buildBaseTerminalRequest(request),
      invoice_id: request.invoiceId ?? '',
    };

    const response = await this.makeAuthenticatedRequest<TerminalTransaction>(
      'post',
      `/capture/${encodeURIComponent(transactionId)}`,
      terminalRequest
    );
    return response.data;
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
      const redactedDetails = sanitizeApiErrorResponseDetails(data);

      if (data?.error) {
        return ErrorFactory.fromApiResponse(
          {
            code: data.error,
            message: data.message || 'Terminal service error',
            status,
            details: redactedDetails,
            request_id: requestId,
          },
          error
        );
      }

      return ErrorFactory.fromApiResponse(
        {
          code: 'API_ERROR',
          message: `Terminal service error: ${status}`,
          status,
          details: redactedDetails,
          request_id: requestId,
        },
        error
      );
    }

    if (error.request) {
      return ErrorFactory.networkError(
        'Network error in terminal service',
        error
      );
    }

    return ErrorFactory.fromApiResponse(
      {
        code: 'UNKNOWN_ERROR',
        message: 'Unknown error in terminal service',
      },
      error
    );
  }
}
