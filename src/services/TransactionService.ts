/**
 * Transaction service for payment processing
 */

import { HttpClient, createApiClient, withAuth } from '../utils/apiClient';
import { stripBearerToken } from '../utils/stripBearerToken';
import { AuthService } from './AuthService';
import { Environment, PayHQSDKConfig } from '../types/common';
import {
  Transaction,
  SaleTransactionRequest,
  AuthorizationTransactionRequest,
  CaptureTransactionRequest,
  RefundTransactionRequest,
  TransactionSearchParams,
  TransactionListResponse,
  TransactionListFilterStatus,
} from '../types/transaction';
import { ErrorFactory, PayHQError } from '../types/errors';
import {
  redactForDebugLogJson,
  sanitizeApiErrorResponseDetails,
} from '../utils/redactForDebugLog';

/**
 * Transaction service for payment processing
 */
export class TransactionService {
  private httpClient: HttpClient;
  private authService: AuthService;
  private config: PayHQSDKConfig;

  /**
   * Create a transaction service client for payment operations.
   */
  constructor(
    config: PayHQSDKConfig,
    environment: Environment,
    authService: AuthService
  ) {
    this.config = config;
    this.authService = authService;

    this.httpClient = createApiClient(
      config,
      environment,
      `${environment.gatewayUrl}/transaction-service`
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

  private getCustomerTransactionPath(
    operation: 'sale' | 'authorize',
    customerLookupId: string,
    cardLookupId: string | undefined
  ): string {
    const encodedCustomerLookupId = encodeURIComponent(customerLookupId);
    if (cardLookupId) {
      const encodedCardLookupId = encodeURIComponent(cardLookupId);
      return `/${operation}/customer/${encodedCustomerLookupId}/card/${encodedCardLookupId}`;
    }
    return `/${operation}/customer/${encodedCustomerLookupId}`;
  }

  /**
   * Validates payment selector combinations before building paths or bodies.
   * Mirrors Payfirma API rules: stored card path requires customer; card XOR token;
   * stored-card lookup cannot be combined with inline card/token.
   */
  private assertValidPaymentSelectors(request: {
    customerLookupId?: string;
    cardLookupId?: string;
    card?: unknown;
    token?: unknown;
  }): void {
    if (request.cardLookupId && !request.customerLookupId) {
      throw new Error(
        'cardLookupId requires customerLookupId. Use customer profile sale/authorize endpoints with a customer lookup id, or omit cardLookupId.'
      );
    }
    if (request.card && request.token) {
      throw new Error(
        'Cannot send both card and token in the same request; the API returns 400 BAD_REQUEST for this combination.'
      );
    }
    if (request.cardLookupId && (request.card || request.token)) {
      throw new Error(
        'cardLookupId cannot be combined with card or token. Use /sale/customer/{customer_lookup_id}/card/{card_lookup_id} with amount only for a stored card, or use customer path with a new card/token and omit cardLookupId.'
      );
    }

    // Plain /sale and /authorize require a card or token in the body; customer
    // flows can use default or stored vault cards with amount only.
    if (!request.customerLookupId && !request.card && !request.token) {
      throw new Error(
        'Provide either card or token for this transaction, or use customerLookupId (and optionally cardLookupId) to charge a stored customer card.'
      );
    }
  }

  private stripLookupFields<
    T extends { customerLookupId?: string; cardLookupId?: string },
  >(request: T): Omit<T, 'customerLookupId' | 'cardLookupId'> {
    const {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      customerLookupId: _customerLookupId,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      cardLookupId: _cardLookupId,
      ...rest
    } = request;
    return rest;
  }

  private buildCustomerProfileSaleBody(
    request: SaleTransactionRequest
  ): SaleTransactionRequest {
    return this.buildCustomerProfileBody(request) as SaleTransactionRequest;
  }

  private buildCustomerProfileAuthorizationBody(
    request: AuthorizationTransactionRequest
  ): AuthorizationTransactionRequest {
    return this.buildCustomerProfileBody(
      request
    ) as AuthorizationTransactionRequest;
  }

  private buildCustomerProfileBody<
    T extends {
      amount: number;
      card?: unknown;
      token?: unknown;
      customerLookupId?: string;
      cardLookupId?: string;
    },
  >(
    request: T
  ): Omit<T, 'customerLookupId' | 'cardLookupId'> | { amount: number } {
    this.assertValidPaymentSelectors(request);
    if (request.card || request.token) {
      return this.stripLookupFields(request as any);
    }
    return { amount: request.amount };
  }

  // Payment Processing

  /**
   * Process a sale transaction
   */
  async createSale(request: SaleTransactionRequest): Promise<Transaction> {
    this.assertValidPaymentSelectors(request);
    const hasCustomerProfile = Boolean(request.customerLookupId);
    const bodyForTransform = hasCustomerProfile
      ? this.buildCustomerProfileSaleBody(request)
      : request;
    const apiRequest = this.transformSaleRequest(bodyForTransform);

    // Enhanced logging for debugging
    if (this.config.debug) {
      console.log('\n=== PayFirma Sale Transaction Debug ===');
      console.log('Original SDK Request:', redactForDebugLogJson(request));
      console.log(
        'Transformed API Request (before snake_case):',
        redactForDebugLogJson(apiRequest)
      );
    }

    const customerLookupId = request.customerLookupId;
    const path =
      hasCustomerProfile && customerLookupId
        ? this.getCustomerTransactionPath(
            'sale',
            customerLookupId,
            request.card || request.token ? undefined : request.cardLookupId
          )
        : '/sale';

    const response = await this.makeAuthenticatedRequest<Transaction>(
      'post',
      path,
      apiRequest
    );

    // Enhanced logging for response
    if (this.config.debug) {
      console.log('Raw API Response:', redactForDebugLogJson(response.data));
      console.log('Response Status:', response.status);
      console.log('=== End PayFirma Debug ===\n');
    }

    return response.data;
  }

  /**
   * Transform sale request to match PayFirma API format
   */
  private transformSaleRequest(request: SaleTransactionRequest): any {
    return this.transformCardRequest(request);
  }

  private transformCardRequest<T extends { card?: any }>(request: T): any {
    const { card, ...baseRequest } = request;

    // If card is provided, flatten its fields to root level
    if (card) {
      return {
        ...baseRequest,
        cardNumber: card.cardNumber,
        cardExpiryMonth: card.cardExpiryMonth,
        cardExpiryYear: card.cardExpiryYear,
        cvv2: card.cvv2,
      };
    }

    return baseRequest;
  }

  /**
   * Create an authorization (hold funds without capturing)
   */
  async createAuthorization(
    request: AuthorizationTransactionRequest
  ): Promise<Transaction> {
    this.assertValidPaymentSelectors(request);
    const hasCustomerProfile = Boolean(request.customerLookupId);
    const bodyForTransform = hasCustomerProfile
      ? this.buildCustomerProfileAuthorizationBody(request)
      : request;
    const apiRequest = this.transformAuthorizationRequest(bodyForTransform);

    const customerLookupId = request.customerLookupId;
    const path =
      hasCustomerProfile && customerLookupId
        ? this.getCustomerTransactionPath(
            'authorize',
            customerLookupId,
            request.card || request.token ? undefined : request.cardLookupId
          )
        : '/authorize';

    const response = await this.makeAuthenticatedRequest<Transaction>(
      'post',
      path,
      apiRequest
    );
    return response.data;
  }

  /**
   * Transform authorization request to match PayFirma API format
   */
  private transformAuthorizationRequest(
    request: AuthorizationTransactionRequest
  ): any {
    return this.transformCardRequest(request);
  }

  /**
   * Capture a previously authorized transaction
   */
  async captureTransaction(
    transactionId: string | number,
    request: CaptureTransactionRequest
  ): Promise<Transaction> {
    const response = await this.makeAuthenticatedRequest<Transaction>(
      'post',
      `/capture/${encodeURIComponent(String(transactionId))}`,
      request
    );
    return response.data;
  }

  /**
   * Refund a transaction
   */
  async refundTransaction(
    transactionId: string | number,
    request: RefundTransactionRequest
  ): Promise<Transaction> {
    const response = await this.makeAuthenticatedRequest<Transaction>(
      'post',
      `/refund/${encodeURIComponent(String(transactionId))}`,
      request
    );
    return response.data;
  }

  /**
   * Get transaction details
   */
  async getTransaction(transactionId: string | number): Promise<Transaction> {
    const response = await this.makeAuthenticatedRequest<Transaction>(
      'get',
      `/transaction/${encodeURIComponent(String(transactionId))}`
    );
    return response.data;
  }

  /**
   * List transactions with filtering
   */
  async listTransactions(
    params?: TransactionSearchParams
  ): Promise<TransactionListResponse> {
    // Transform search parameters to match PayFirma API parameter names
    const apiParams = this.transformSearchParams(params);

    const response = await this.makeAuthenticatedRequest<any>(
      'get',
      '/transaction',
      undefined,
      { params: apiParams }
    );

    // Debug: Log the actual response structure
    if (this.config.debug) {
      console.log(
        'DEBUG: listTransactions raw response:',
        redactForDebugLogJson(response.data)
      );
    }

    return this.normalizeTransactionListResponse(response.data);
  }

  /**
   * List transactions for the authenticated user with filtering
   */
  async listUserTransactions(
    params?: TransactionSearchParams
  ): Promise<TransactionListResponse> {
    const apiParams = this.transformSearchParams(params);
    const response = await this.makeAuthenticatedRequest<any>(
      'get',
      '/transaction/user',
      undefined,
      { params: apiParams }
    );
    return this.normalizeTransactionListResponse(response.data);
  }

  private normalizeTransactionListResponse(data: any): TransactionListResponse {
    // Handle different possible response structures
    let entities: Transaction[] = [];
    let paging: any = undefined;

    if (data) {
      // If response.data is already an array, use it directly
      if (Array.isArray(data)) {
        entities = data;
      }
      // If response.data has entities property
      else if (data.entities && Array.isArray(data.entities)) {
        entities = data.entities;
        paging = data.paging;
      }
      // If response.data has transactions property (alternative structure)
      else if (data.transactions && Array.isArray(data.transactions)) {
        entities = data.transactions;
        paging = data.paging;
      }
    }

    return {
      entities,
      paging,
    };
  }

  /**
   * Transform search parameters to match PayFirma API parameter names
   */
  private transformSearchParams(params?: TransactionSearchParams): any {
    if (!params) return {};

    const apiParams: any = {};

    // Direct mappings
    if (params.limit !== undefined) apiParams.limit = params.limit;
    if (params.before !== undefined) apiParams.before = params.before;
    if (params.after !== undefined) apiParams.after = params.after;
    if (params.channel !== undefined) {
      apiParams.channel = Array.isArray(params.channel)
        ? params.channel.join(',')
        : params.channel;
    }

    // Date range handling
    if (params.dateRange) {
      if (params.dateRange.startDate) {
        // Convert timestamp to YYYY-MM-DD format if needed
        const startDate =
          typeof params.dateRange.startDate === 'number'
            ? new Date(params.dateRange.startDate).toISOString().split('T')[0]
            : params.dateRange.startDate;
        apiParams.from_date = startDate;
      }
      if (params.dateRange.endDate) {
        // Convert timestamp to YYYY-MM-DD format if needed
        const endDate =
          typeof params.dateRange.endDate === 'number'
            ? new Date(params.dateRange.endDate).toISOString().split('T')[0]
            : params.dateRange.endDate;
        apiParams.to_date = endDate;
      }
    }

    // Direct date parameters (take precedence over dateRange)
    if (params.fromDate !== undefined) apiParams.from_date = params.fromDate;
    if (params.toDate !== undefined) apiParams.to_date = params.toDate;

    // Transaction status (list API: comma-separated PENDING, APPROVED, DECLINED)
    if (params.status !== undefined) {
      apiParams.transaction_status = Array.isArray(params.status)
        ? params.status.join(',')
        : params.status;
    }

    // Amount filters
    if (params.amountMin !== undefined) apiParams.min_amount = params.amountMin;
    if (params.amountMax !== undefined) apiParams.max_amount = params.amountMax;

    // Customer information
    if (params.email !== undefined) apiParams.email_address = params.email;
    if (params.firstName !== undefined) apiParams.first_name = params.firstName;
    if (params.lastName !== undefined) apiParams.last_name = params.lastName;

    return apiParams;
  }

  // Convenience Methods

  /**
   * Quick sale with card details
   */
  async quickSale(
    amount: number,
    cardNumber: string,
    expiryMonth: number,
    expiryYear: number,
    cvv: string,
    currency: string = 'CAD'
  ): Promise<Transaction> {
    return this.createSale({
      amount,
      currency: currency as any,
      card: {
        cardNumber: cardNumber,
        cardExpiryMonth: expiryMonth,
        cardExpiryYear: expiryYear,
        cvv2: cvv,
      },
    });
  }

  /**
   * Sale with encrypted token
   */
  async saleWithToken(
    amount: number,
    token: string,
    currency: string = 'CAD'
  ): Promise<Transaction> {
    return this.createSale({
      amount,
      currency: currency as any,
      token,
    });
  }

  /**
   * Quick authorization with card details
   */
  async quickAuthorization(
    amount: number,
    cardNumber: string,
    expiryMonth: number,
    expiryYear: number,
    cvv: string,
    currency: string = 'CAD'
  ): Promise<Transaction> {
    return this.createAuthorization({
      amount,
      currency: currency as any,
      card: {
        cardNumber: cardNumber,
        cardExpiryMonth: expiryMonth,
        cardExpiryYear: expiryYear,
        cvv2: cvv,
      },
    });
  }

  /**
   * Full refund
   */
  async fullRefund(transactionId: string): Promise<Transaction> {
    // First get the transaction to get the full amount and numeric ID
    const transaction = await this.getTransaction(transactionId);
    return this.refundTransaction(transaction.id, {
      amount: transaction.amount,
    });
  }

  /**
   * Partial refund
   */
  async partialRefund(
    transactionId: string | number,
    amount: number,
    reason?: string
  ): Promise<Transaction> {
    const request: RefundTransactionRequest = {
      amount,
    };

    if (reason !== undefined) {
      request.description = reason;
    }

    return this.refundTransaction(transactionId, request);
  }

  /**
   * Capture full authorization
   */
  async captureFullAmount(transactionId: string): Promise<Transaction> {
    // First get the transaction to get the full amount and numeric ID
    const transaction = await this.getTransaction(transactionId);
    return this.captureTransaction(transaction.id, {
      amount: transaction.amount,
    });
  }

  /**
   * Capture partial authorization
   */
  async capturePartialAmount(
    transactionId: string | number,
    amount: number
  ): Promise<Transaction> {
    return this.captureTransaction(transactionId, {
      amount,
    });
  }

  // Search and Filter Methods

  /**
   * Get transactions by status
   */
  async getTransactionsByStatus(
    status: TransactionListFilterStatus
  ): Promise<Transaction[]> {
    const response = await this.listTransactions({ status });
    return response.entities || [];
  }

  /**
   * Get transactions by date range
   */
  async getTransactionsByDateRange(
    startDate: string | number,
    endDate: string | number
  ): Promise<Transaction[]> {
    const response = await this.listTransactions({
      dateRange: {
        startDate: startDate,
        endDate: endDate,
      },
    });
    return response.entities || [];
  }

  /**
   * Get transactions by amount range
   */
  async getTransactionsByAmountRange(
    minAmount: number,
    maxAmount: number
  ): Promise<Transaction[]> {
    const response = await this.listTransactions({
      amountMin: minAmount,
      amountMax: maxAmount,
    });
    return response.entities || [];
  }

  /**
   * Get transactions by customer email
   */
  async getTransactionsByCustomerEmail(email: string): Promise<Transaction[]> {
    const response = await this.listTransactions({
      email: email,
    });
    return response.entities || [];
  }

  /**
   * Get approved transactions
   */
  async getApprovedTransactions(): Promise<Transaction[]> {
    return this.getTransactionsByStatus('APPROVED');
  }

  /**
   * Get declined transactions
   */
  async getDeclinedTransactions(): Promise<Transaction[]> {
    return this.getTransactionsByStatus('DECLINED');
  }

  /**
   * Get pending transactions
   */
  async getPendingTransactions(): Promise<Transaction[]> {
    return this.getTransactionsByStatus('PENDING');
  }

  /**
   * Get refunded transactions (Note: may require client-side filtering)
   */
  async getRefundedTransactions(): Promise<Transaction[]> {
    // Note: The PayFirma API doesn't directly support filtering by transaction type in the list endpoint
    // This would need to be filtered client-side from the full list
    const response = await this.listTransactions();
    return (response.entities || []).filter(
      t => t.transactionType === 'REFUND'
    );
  }

  // Reporting and Analytics

  /**
   * Get transaction summary
   */
  async getTransactionSummary(params?: TransactionSearchParams): Promise<any> {
    const response = await this.listTransactions(params);
    const transactions = response.entities || [];

    const summary: any = {
      total_count: transactions.length,
      total_amount: transactions.reduce((sum, t) => sum + t.amount, 0),
      currency: transactions[0]?.currency || 'CAD',
      status_breakdown: {
        approved: transactions.filter(t => t.transactionResult === 'APPROVED')
          .length,
        declined: transactions.filter(t => t.transactionResult === 'DECLINED')
          .length,
        pending: transactions.filter(t => t.transactionResult === 'PENDING')
          .length,
        cancelled: transactions.filter(t => t.transactionResult === 'CANCELLED')
          .length,
        failed: transactions.filter(t => t.transactionResult === 'FAILED')
          .length,
      },
      type_breakdown: {
        sales: transactions.filter(t => t.transactionType === 'SALE').length,
        authorizations: transactions.filter(
          t => t.transactionType === 'AUTHORIZATION'
        ).length,
        captures: transactions.filter(t => t.transactionType === 'CAPTURE')
          .length,
        refunds: transactions.filter(t => t.transactionType === 'REFUND')
          .length,
        voids: transactions.filter(t => t.transactionType === 'VOID').length,
      },
    };

    return summary;
  }

  /**
   * Get daily transaction volume
   */
  async getDailyVolume(date: string): Promise<{
    date: string;
    transaction_count: number;
    total_amount: number;
    currency: string;
  }> {
    const startDate = new Date(date);
    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);

    const transactions = await this.getTransactionsByDateRange(
      startDate.getTime(),
      endDate.getTime()
    );

    return {
      date,
      transaction_count: transactions.length,
      total_amount: transactions.reduce((sum, t) => sum + t.amount, 0),
      currency: transactions[0]?.currency || 'CAD',
    };
  }

  /**
   * Check if transaction exists
   */
  async transactionExists(transactionId: string | number): Promise<boolean> {
    try {
      await this.getTransaction(transactionId);
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

      // Log detailed error information for debugging
      if (this.config.debug) {
        // Never log headers, bodies, full URLs (query may hold secrets), or
        // full response payloads — they can contain PAN/CVV, tokens, or
        // Authorization values.
        console.error('PayFirma Transaction Error Details:');
        console.error('Status:', status);
        if (requestId) {
          console.error('Request ID:', requestId);
        }
        const reqUrl = error.request?.url;
        if (typeof reqUrl === 'string') {
          try {
            const { pathname } = new URL(reqUrl, 'http://local.invalid');
            console.error('Request path:', pathname);
          } catch {
            // Omit path if URL is unparsable — do not log the raw string.
          }
        }
      }

      if (data?.error) {
        return ErrorFactory.fromApiResponse(
          {
            code: data.error,
            message: data.message || 'Transaction service error',
            status,
            details: sanitizedDetails,
            request_id: requestId,
          },
          error
        );
      }

      // Check for PayFirma error array format
      if (
        data?.errors &&
        Array.isArray(data.errors) &&
        data.errors.length > 0
      ) {
        const firstError = data.errors[0];
        return ErrorFactory.fromApiResponse(
          {
            code: firstError.code || 'API_ERROR',
            message:
              firstError.message || data.message || 'Transaction service error',
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
          message: `Transaction service error: ${status}`,
          status,
          details: sanitizedDetails,
          request_id: requestId,
        },
        error
      );
    }

    if (error.request) {
      return ErrorFactory.networkError(
        'Network error in transaction service',
        error
      );
    }

    return ErrorFactory.fromApiResponse(
      {
        code: 'UNKNOWN_ERROR',
        message: 'Unknown error in transaction service',
      },
      error
    );
  }
}
