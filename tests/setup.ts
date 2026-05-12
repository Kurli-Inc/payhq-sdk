/**
 * Test setup and configuration
 *
 * Integration tests read sandbox credentials from environment variables:
 *   PAYHQ_CLIENT_ID
 *   PAYHQ_CLIENT_SECRET
 *
 * No credentials are committed to source. See tests/README.md for setup.
 */

import { PayHQSDK } from '../src/PayHQSDK';

process.env['NODE_ENV'] = process.env['NODE_ENV'] || 'development';

const CLIENT_ID = process.env['PAYHQ_CLIENT_ID'] || '';
const CLIENT_SECRET = process.env['PAYHQ_CLIENT_SECRET'] || '';

export const hasIntegrationCredentials =
  CLIENT_ID.length > 0 && CLIENT_SECRET.length > 0;

export const SANDBOX_CONFIG = {
  clientId: CLIENT_ID,
  clientSecret: CLIENT_SECRET,
  sandbox: true,
};

// Test card numbers for sandbox (these are standard test cards)
export const TEST_CARDS = {
  VISA_APPROVED: {
    number: '4111111111111111',
    month: 12,
    year: 25, // 2-digit year as expected by PayFirma API
    cvv: '123',
  },
  VISA_DECLINED: {
    number: '4000000000000002',
    month: 12,
    year: 25,
    cvv: '123',
  },
  MASTERCARD_APPROVED: {
    number: '5555555555554444',
    month: 12,
    year: 25,
    cvv: '123',
  },
  AMEX_APPROVED: {
    number: '378282246310005',
    month: 12,
    year: 25,
    cvv: '1234',
  },
};

// Test amounts based on PayFirma Test Processor rules:
// Odd amounts (before decimal) = APPROVED, Even amounts = DECLINED
export const TEST_AMOUNTS = {
  APPROVED_SMALL: 11.0, // Odd = APPROVED
  APPROVED_MEDIUM: 101.0, // Odd = APPROVED
  APPROVED_LARGE: 1001.0, // Odd = APPROVED
  DECLINED_SMALL: 10.0, // Even = DECLINED
  DECLINED_MEDIUM: 100.0, // Even = DECLINED
  DECLINED_LARGE: 1000.0, // Even = DECLINED
  // Special decline cases with specific error messages
  SPECIAL_TOKENIZE_ERROR: 2.1, // "Failed to tokenize card information"
  SPECIAL_EMAIL_REQUIRED: 2.2, // "Email is required"
  SPECIAL_MISSING_CARD_INFO: 2.3, // "Missing mandatory card information field(s)"
  SPECIAL_NOT_SUPPORTED: 2.4, // "Transaction Not Supported"
  SPECIAL_DETOKENIZE_ERROR: 2.5, // "Failed to de-tokenize card information"
  SPECIAL_AUTH_FAILED: 2.6, // "Failed to authorize"
};

/**
 * Create a test SDK instance.
 *
 * Throws if integration credentials are not provided via env vars. Integration
 * test suites should guard with `hasIntegrationCredentials` (or use
 * `describe.skip` / `it.skip`) so they do not run in environments without
 * sandbox access (e.g. open-source CI).
 */
export function createTestSDK(): PayHQSDK {
  if (!hasIntegrationCredentials) {
    throw new Error(
      'Integration tests require PAYHQ_CLIENT_ID and PAYHQ_CLIENT_SECRET ' +
        'environment variables. See tests/README.md.'
    );
  }
  return new PayHQSDK(SANDBOX_CONFIG);
}

/**
 * Wait for a specified time (useful for rate limiting)
 */
export function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Generate a random order ID for testing
 */
export function generateOrderId(): string {
  return `test-order-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Generate test customer data
 */
export function generateTestCustomer() {
  const id = Math.random().toString(36).substr(2, 9);
  return {
    first_name: 'Test',
    last_name: 'Customer',
    email: `test.customer.${id}@example.com`,
    phone: '555-123-4567',
    address: {
      street: '123 Test Street',
      city: 'Vancouver',
      province: 'BC',
      country: 'CA',
      postal_code: 'V6B 1A1',
    },
  };
}

// Common test timeout
export const TEST_TIMEOUT = 30000; // 30 seconds

// Jest setup
beforeAll(async () => {
  // Any global setup if needed
});

afterAll(async () => {
  // Any global cleanup if needed
});
