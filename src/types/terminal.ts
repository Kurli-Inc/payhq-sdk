/**
 * Card Terminal Service type definitions
 */

import { Currency, ContactInfo, Address } from './common';

/**
 * Terminal transaction types
 */
export enum TerminalTransactionTypeEnum {
  SALE = 'SALE',
  REFUND = 'REFUND',
  AUTHORIZE = 'AUTHORIZE',
  CAPTURE = 'CAPTURE',
}

export type TerminalTransactionType = `${TerminalTransactionTypeEnum}`;

/**
 * Terminal transaction status
 */
export enum TerminalTransactionStatusEnum {
  APPROVED = 'APPROVED',
  DECLINED = 'DECLINED',
  PENDING = 'PENDING',
  CANCELLED = 'CANCELLED',
  FAILED = 'FAILED',
}

export type TerminalTransactionStatus = `${TerminalTransactionStatusEnum}`;

/**
 * Terminal sale request with customer lookup
 */
export interface TerminalSaleWithCustomerRequest {
  /** Customer lookup ID */
  customerLookupId: string;
  /** Transaction amount */
  amount: number;
  /** Currency code */
  currency: Currency;
  /** Processor ID for this terminal */
  processorId: number;
  /** Customer first name */
  firstName?: string;
  /** Customer last name */
  lastName?: string;
  /** Company name */
  company?: string;
  /** Order ID */
  orderId?: string;
  /** Invoice ID */
  invoiceId?: string;
  /** Transaction description */
  description?: string;
  /** Customer email */
  email?: string;
}

/**
 * Terminal sale request without customer lookup (matches API documentation)
 */
export interface TerminalSaleRequest
  extends Partial<ContactInfo>,
    Partial<Address> {
  /** Transaction amount */
  amount: number;
  /** Currency code */
  currency: Currency;
  /** Processor ID for this terminal */
  processorId: number;
  /** Order ID */
  orderId?: string;
  /** Invoice ID */
  invoiceId?: string;
  /** Transaction description */
  description?: string;
}

/**
 * Terminal refund request (matches API documentation)
 */
export interface TerminalRefundRequest {
  /** Original transaction ID */
  originalTransactionId: string;
  /** Refund amount */
  amount: number;
  /** Currency code */
  currency: Currency;
  /** Processor ID for this terminal */
  processorId: number;
  /** Customer first name */
  firstName?: string;
  /** Customer last name */
  lastName?: string;
  /** Company name */
  company?: string;
  /** Invoice ID */
  invoiceId?: string;
  /** Customer email */
  email?: string;
}

/**
 * Terminal authorization request (matches API documentation)
 */
export interface TerminalAuthorizationRequest extends Partial<ContactInfo> {
  /** Authorization amount */
  amount: number;
  /** Currency code */
  currency: Currency;
  /** Processor ID for this terminal */
  processorId: number;
  /** Order ID */
  orderId?: string;
  /** Invoice ID */
  invoiceId?: string;
  /** Transaction description */
  description?: string;
}

/**
 * Terminal capture request (matches API documentation)
 */
export interface TerminalCaptureRequest {
  /** Amount to capture */
  amount: number;
  /** Currency code */
  currency: Currency;
  /** Processor ID for this terminal */
  processorId: number;
  /** Invoice ID */
  invoiceId?: string;
}

/**
 * Terminal transaction response (matches actual API response structure after camelCase transformation)
 */
export interface TerminalTransaction {
  /** Payfirma transaction ID (numeric) */
  id: number;
  /** Transaction ID (alphanumeric) */
  transactionId: string;
  /** Transaction success flag */
  transactionSuccess: boolean;
  /** Transaction result (APPROVED, DECLINED, etc.) */
  transactionResult: TerminalTransactionStatus;
  /** Transaction timestamp (Unix timestamp in ms) */
  transactionTime: number;
  /** Transaction type */
  transactionType: TerminalTransactionType;
  /** Transaction amount */
  amount: number;
  /** Currency code */
  currency?: Currency;
  /** Customer email */
  email?: string;
  /** Customer first name */
  firstName?: string;
  /** Customer last name */
  lastName?: string;
  /** Company name */
  company?: string;
  /** Card type */
  cardType?: string;
  /** Card suffix (last 4 digits) */
  cardSuffix?: string;
  /** Invoice ID */
  invoiceId?: string;
  /** Order ID */
  orderId?: string;
  /** Transaction description */
  description?: string;
  /** Processor authorization code (may include trailing spaces from gateway) */
  processorAuthCode?: string;
  /** Processor-side transaction identifier */
  processorTransactionId?: string;
  /** Customer address line 1 */
  address1?: string;
  /** Customer address line 2 */
  address2?: string;
  /** Customer city */
  city?: string;
  /** Customer province/state */
  province?: string;
  /** Customer country */
  country?: string;
  /** Customer postal code */
  postalCode?: string;
  /** Customer phone */
  telephone?: string;
  /** BCC emails */
  bccEmails?: string[] | null;
}

/**
 * Terminal status
 */
export enum TerminalStatusEnum {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  OFFLINE = 'OFFLINE',
}

export type TerminalStatus = `${TerminalStatusEnum}`;

/**
 * Terminal configuration
 */
export interface TerminalConfig {
  /** Terminal ID */
  terminalId: string;
  /** Terminal name */
  name: string;
  /** Terminal type */
  type: string;
  /** Terminal status */
  status: TerminalStatus;
  /** Terminal location */
  location?: string;
  /** Supported payment methods */
  paymentMethods: string[];
  /** Terminal settings */
  settings?: {
    /** Default currency */
    defaultCurrency: Currency;
    /** Enable tips */
    enableTips: boolean;
    /** Enable receipts */
    enableReceipts: boolean;
    /** Timeout settings */
    timeout: number;
  };
}
