/**
 * Customer Service type definitions
 */

import {
  Address,
  ContactInfo,
  LookupReference,
  PaginationParams,
  Currency,
} from './common';

/**
 * Customer creation request
 */
export interface CreateCustomerRequest extends ContactInfo, Address {
  /** Customer email address (required) */
  email: string;
  /** Additional email for BCC receipts */
  bccEmails?: string;
  /** Custom identifier for the customer */
  customId?: string;
}

/**
 * Customer update request
 */
export interface UpdateCustomerRequest
  extends Partial<ContactInfo>,
    Partial<Address> {
  /** Additional email for BCC receipts */
  bccEmails?: string;
  /** Custom identifier for the customer */
  customId?: string;
}

/**
 * Customer search parameters
 */
export interface CustomerSearchParams extends PaginationParams {
  /** Filter by email address (`email_address`) */
  emailAddress?: string;
  /** Filter by first name (`first_name`) */
  firstName?: string;
  /** Filter by last name (`last_name`) */
  lastName?: string;
  /** Filter by company name */
  company?: string;
  /** Filter customers with subscriptions (`with_subscription`) */
  withSubscription?: boolean;
}

/**
 * Card information for creating/updating cards.
 */
export interface CardRequest {
  /** Card number */
  cardNumber: string;
  /** Card expiry month (1-12) */
  cardExpiryMonth: number;
  /** Card expiry year (2-digit e.g. 25 for 2025, or 4-digit) */
  cardExpiryYear: number;
  /** Card verification value */
  cvv2: string;
  /** Whether this card is the default payment method */
  isDefault?: boolean;
  /** Description for the card */
  cardDescription?: string;
}

/**
 * Card update request (matches Customer API documented fields)
 */
export interface UpdateCardRequest {
  /** Whether this card is the default payment method */
  isDefault?: boolean;
  /** Description for the card */
  cardDescription?: string;
}

/**
 * Stored card information (PCI-compliant)
 */
export interface Card extends LookupReference {
  /** Card expiry in MM/YY format */
  cardExpiry: string;
  /** First 4 digits of card number */
  cardPrefix: string;
  /** Last 4 digits of card number */
  cardSuffix: string;
  /** Whether this is the default card */
  isDefault: boolean;
  /** Card description */
  cardDescription?: string;
}

/**
 * Subscription status
 */
export enum SubscriptionStatusEnum {
  ACTIVE = 'ACTIVE',
  CANCELED = 'CANCELED',
  CANCELLED = 'CANCELLED',
  PAUSED = 'PAUSED',
  EXPIRED = 'EXPIRED',
}

export type SubscriptionStatus = `${SubscriptionStatusEnum}`;

/**
 * Subscription frequency
 */
export enum SubscriptionFrequencyEnum {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  YEARLY = 'YEARLY',
}

export type SubscriptionFrequency = `${SubscriptionFrequencyEnum}`;

/**
 * Subscription information
 */
export interface Subscription extends LookupReference {
  /** Associated plan ID */
  planId: number;
  /** Associated plan lookup ID */
  planLookupId: string;
  /** Plan name */
  name: string;
  /** Current subscription status */
  status: SubscriptionStatus;
  /** Subscription amount */
  amount: number;
  /** Currency code */
  currency: Currency;
  /** Billing frequency */
  frequency: SubscriptionFrequency;
  /** Last successful payment timestamp */
  lastSuccess?: number;
  /** Last run timestamp */
  lastRun?: number;
  /** Next scheduled run timestamp */
  nextRun?: number;
  /** Total number of billing cycles */
  totalCycles?: number;
  /** Completed billing cycles */
  completedCycles?: number;
  /** Remaining billing cycles */
  remainingCycles?: number;
  /** Number of failed payment attempts */
  failedAttempts?: number;
  /** Number of delinquent cycles */
  delinquentCycles?: number;
  /** Timestamp when subscription became delinquent */
  delinquentSince?: number;
}

/**
 * Subscription creation request
 */
export interface CreateSubscriptionRequest {
  /** Plan lookup ID */
  planLookupId: string;
  /** Card lookup ID to use for payments */
  cardLookupId: string;
  /** Subscription amount (can override plan amount) */
  amount?: number;
  /** Start date for subscription (Unix timestamp in milliseconds; must be in the future) */
  startDate: number;
  /** Email for subscription receipts */
  email?: string;
  /** Additional email for BCC receipts */
  bccEmails?: string;
  /** Subscription description */
  description?: string;
}

/**
 * Subscription update request
 */
export interface UpdateSubscriptionRequest {
  /** New subscription amount */
  amount?: number;
  /** New card lookup ID */
  cardLookupId?: string;
  /** New start date */
  startDate?: number;
  /** New email for receipts */
  email?: string;
  /** Additional email for BCC receipts */
  bccEmails?: string;
  /** New description */
  description?: string;
  /** New status */
  status?: SubscriptionStatus;
}

/**
 * Complete customer object
 */
export interface Customer extends LookupReference, ContactInfo, Address {
  /** Customer email address */
  email: string;
  /** Additional email for BCC receipts */
  bccEmails?: string;
  /** Custom identifier */
  customId?: string;
  /** Associated cards */
  cards: Card[];
  /** Associated subscriptions */
  subscriptions: Subscription[];
}

/**
 * Customer list response
 */
export interface CustomerListResponse {
  /** Array of customers */
  entities: Customer[];
  paging?: {
    cursors: {
      before: string;
      after: string;
    };
  };
}
