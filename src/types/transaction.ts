/**
 * Transaction Service type definitions
 */

import {
  Currency,
  ContactInfo,
  Address,
  PaginationParams,
  DateRange,
} from './common';

/**
 * Transaction types
 */
export enum TransactionTypeEnum {
  SALE = 'SALE',
  AUTHORIZATION = 'AUTHORIZATION',
  CAPTURE = 'CAPTURE',
  REFUND = 'REFUND',
  VOID = 'VOID',
}

export type TransactionType = `${TransactionTypeEnum}`;

/**
 * Transaction status
 */
export enum TransactionStatusEnum {
  APPROVED = 'APPROVED',
  DECLINED = 'DECLINED',
  PENDING = 'PENDING',
  CANCELLED = 'CANCELLED',
  FAILED = 'FAILED',
}

export type TransactionStatus = `${TransactionStatusEnum}`;

/**
 * Allowed values for transaction list `transaction_status` query (comma-separated in the API).
 * Narrower than {@link TransactionStatusEnum}, which includes values returned on transaction rows.
 */
export enum TransactionListFilterStatusEnum {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  DECLINED = 'DECLINED',
}

export type TransactionListFilterStatus = `${TransactionListFilterStatusEnum}`;

/**
 * Transaction source / list `channel` query (comma-separated in the API).
 */
export enum TransactionSourceEnum {
  VT = 'VT',
  MOBILE = 'MOBILE',
  TABLET_POS = 'TABLET_POS',
  E_COMMERCE = 'E_COMMERCE',
  RECURRING = 'RECURRING',
  INVOICE = 'INVOICE',
  CARD_TERMINAL = 'CARD_TERMINAL',
}

export type TransactionSource = `${TransactionSourceEnum}`;

/** Alias of {@link TransactionSourceEnum} for list `channel` filters (same runtime enum). */
export { TransactionSourceEnum as TransactionListChannelEnum };
export type TransactionListChannel = TransactionSource;

/**
 * Card information for transactions
 */
export interface TransactionCard {
  /** Card number */
  cardNumber: string;
  /** Card expiry month (1-12) */
  cardExpiryMonth: number;
  /** Card expiry year (2-digit) */
  cardExpiryYear: number;
  /** Card verification value */
  cvv2: string;
}

/**
 * Base transaction request
 */
export interface BaseTransactionRequest
  extends Partial<ContactInfo>,
    Partial<Address> {
  /** Transaction amount */
  amount: number;
  /** Currency code */
  currency: Currency;
  /** Whether this is a test transaction */
  testMode?: boolean;
  /** Order ID for reference */
  orderId?: string;
  /** Transaction description */
  description?: string;
  /** Whether to send receipt email */
  sendReceipt?: boolean;
  /** Whether or not a transaction will send a receipt to the customer email provided */
  sendingReceipt?: boolean;
  /** Additional invoice/receipt information */
  invoiceInfo?: {
    /** Invoice number */
    invoiceNumber?: string;
    /** Purchase order number */
    poNumber?: string;
    /** Tax amount */
    taxAmount?: number;
    /** Shipping amount */
    shippingAmount?: number;
    /** Discount amount */
    discountAmount?: number;
  };
  /** A description field to record any general customer identifying information */
  customId?: string;
  /** An open description field to help with transaction tracking and reporting */
  invoiceId?: string;
  /** Additional email for receipt (expense tracking/accounting) */
  bccEmails?: string;
  /** Custom fields */
  customFields?: Record<string, any>;
}

/**
 * Sale transaction request
 */
export interface SaleTransactionRequest extends BaseTransactionRequest {
  /** Card information or token */
  card?: TransactionCard;
  /** Encrypted card token */
  token?: string;
  /** Customer lookup ID for stored card payment */
  customerLookupId?: string;
  /** Specific card lookup ID (if not using default) */
  cardLookupId?: string;
}

/**
 * Authorization transaction request
 */
export interface AuthorizationTransactionRequest
  extends BaseTransactionRequest {
  /** Card information or token */
  card?: TransactionCard;
  /** Encrypted card token */
  token?: string;
  /** Customer lookup ID for stored card payment */
  customerLookupId?: string;
  /** Specific card lookup ID (if not using default) */
  cardLookupId?: string;
}

/**
 * Capture transaction request
 */
export interface CaptureTransactionRequest {
  /** Amount to capture (can be less than authorized amount) */
  amount: number;
  /** Transaction description */
  description?: string;
  /** Whether this is a test transaction */
  testMode?: boolean;
}

/**
 * Refund transaction request
 */
export interface RefundTransactionRequest {
  /** Amount to refund (can be partial) */
  amount: number;
  /** Refund reason/description */
  description?: string;
  /** Whether this is a test transaction */
  testMode?: boolean;
  /** Custom reference number */
  customId?: string;
}

/**
 * Query parameters for GET `/transaction` and GET `/transaction/user`
 * (only filters supported by the list API).
 */
export interface TransactionSearchParams extends PaginationParams {
  /**
   * Date range; sent as `from_date` / `to_date`. Numeric values are normalized to YYYY-MM-DD.
   */
  dateRange?: DateRange;
  /** Optional start date (`from_date`), YYYY-MM-DD. Takes precedence over `dateRange.startDate`. */
  fromDate?: string;
  /** Optional end date (`to_date`), YYYY-MM-DD. Takes precedence over `dateRange.endDate`. */
  toDate?: string;
  /**
   * `transaction_status` — comma-separated in the API, or pass an array to join.
   * Allowed: PENDING, APPROVED, DECLINED.
   */
  status?: TransactionListFilterStatus | TransactionListFilterStatus[] | string;
  /**
   * `channel` — comma-separated in the API, or pass an array to join.
   */
  channel?: TransactionListChannel | TransactionListChannel[] | string;
  /** `min_amount` */
  amountMin?: number;
  /** `max_amount` */
  amountMax?: number;
  /** `email_address` */
  email?: string;
  /** `first_name` */
  firstName?: string;
  /** `last_name` */
  lastName?: string;
}

/**
 * Transaction response (matches PayFirma API response structure after camelCase transformation)
 * Based on official PayFirma API documentation and verified against real API responses
 */
export interface Transaction {
  /** Internal ID representation */
  id: number;
  /** Transaction ID */
  transactionId?: string;
  /** Transaction type */
  transactionType: TransactionType;
  /** Transaction success boolean */
  transactionSuccess: boolean;
  /** Transaction result status */
  transactionResult: TransactionStatus;
  /** Details on the transaction result */
  transactionMessage: string;
  /** UNIX timestamp when transaction was processed (in milliseconds) */
  transactionTime: number;
  /** Transaction amount in dollars */
  amount: number;
  /** Whether the transaction was captured - NOTE: Not returned by actual API */
  captured?: boolean;
  /** Transaction currency - NOTE: Not returned by actual API despite being in docs */
  currency?: Currency;
  /** Brand of the credit card (Visa, Mastercard, Amex) */
  cardType?: string;
  /** Last 4 digits of the credit card - CONFIRMED: returned as STRING, not number */
  cardSuffix?: string;
  /** Expiration date of the card in MM/YY format */
  cardExpiry?: string;
  /** Whether this is a test transaction - NOTE: Not returned by actual API */
  testMode?: boolean;

  // Customer information fields (from API docs) - CONFIRMED: all preserved when sent
  /** Customer email address */
  email?: string;
  /** Customer first name */
  firstName?: string;
  /** Customer last name */
  lastName?: string;
  /** Business name associated with customer */
  company?: string;
  /** Additional email for receipt (expense tracking/accounting) */
  bccEmails?: string;
  /** Customer telephone number */
  telephone?: string;
  /** First line of customer address */
  address1?: string;
  /** Second line of customer address */
  address2?: string;
  /** City where customer is located */
  city?: string;
  /** Province (Canada) or State (US) where customer resides */
  province?: string;
  /** Country where customer is located */
  country?: string;
  /** 6-digit postal code (Canada) or 5-9 digit zip code (US) */
  postalCode?: string;

  // System fields from API docs - CONFIRMED: work correctly
  /** A description field to record any general customer identifying information */
  customId?: string;
  /** Invoice ID for transaction tracking and reporting */
  invoiceId?: string;

  // Additional fields that may be present in responses
  /** Transaction source/channel */
  transactionSource?: TransactionSource;
  /** User ID of staff associated with this transaction */
  userId?: number;
  /** Hashed identifier for saved customers, cards, plans and subscriptions */
  lookupId?: number;
  /** Authorization code from processor */
  processorAuthCode?: string;
  /** Transaction ID from processor */
  processorTransactionId?: string;
  /** Refunded amount from this transaction in dollars */
  amountRefunded?: number;
  /** Tip amount for this transaction in dollars */
  amountTip?: number;
  /** Tax amount for this transaction in dollars */
  amountTax?: number;
}

/**
 * Transaction list response
 */
export interface TransactionListResponse {
  /** Array of transactions */
  entities: Transaction[];
  /** Pagination metadata */
  paging?: {
    /** Pagination cursors */
    cursors?: {
      /** Before cursor for previous page */
      before?: string;
      /** After cursor for next page */
      after?: string;
    };
  };
}

/**
 * Transaction statistics response
 */
export interface TransactionStatsResponse {
  /** Total number of transactions */
  totalCount: number;
  /** Total transaction amount */
  totalAmount: number;
  /** Average transaction amount */
  averageAmount: number;
  /** Number of successful transactions */
  successfulCount: number;
  /** Number of declined transactions */
  declinedCount: number;
  /** Success rate percentage */
  successRate: number;
  /** Statistics by transaction type */
  byType: Record<
    TransactionType,
    {
      count: number;
      amount: number;
      successRate: number;
    }
  >;
  /** Statistics by currency */
  byCurrency: Record<
    Currency,
    {
      count: number;
      amount: number;
    }
  >;
}
