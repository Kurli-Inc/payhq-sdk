/**
 * Comprehensive tests for TransactionService
 * Tests all transaction operations with various scenarios
 * Integration coverage for TransactionService against the Payfirma sandbox
 */

import { PayHQSDK } from '../src/PayHQSDK';
import { TransactionService } from '../src/services/TransactionService';
import { hasIntegrationCredentials } from './setup';

const describeIntegration = hasIntegrationCredentials
  ? describe
  : describe.skip;

const TEST_CONFIG = {
  clientId: process.env['PAYHQ_CLIENT_ID']!,
  clientSecret: process.env['PAYHQ_CLIENT_SECRET']!,
  sandbox: true,
};

const TEST_TIMEOUT = 30000; // 30 seconds for API calls

const TEST_AMOUNTS = {
  APPROVED_SMALL: 1.01,
  APPROVED_MEDIUM: 25.99,
  APPROVED_LARGE: 99.99,
  DECLINED_SMALL: 2.02,
  DECLINED_MEDIUM: 50.0,
  DECLINED_LARGE: 200.0,
  // Special test amounts for specific error messages (PayFirma test processor)
  SPECIAL_TOKENIZE_ERROR: 2.1,
  SPECIAL_EMAIL_REQUIRED: 2.2,
  SPECIAL_MISSING_CARD_INFO: 2.3,
  SPECIAL_NOT_SUPPORTED: 2.4,
  SPECIAL_DETOKENIZE_ERROR: 2.5,
  SPECIAL_AUTH_FAILED: 2.6,
};

const TEST_CARDS = {
  VISA_APPROVED: {
    number: '4111111111111111',
    month: 12,
    year: 25,
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

// Helper function to validate transaction response structure
function validateTransactionResponse(
  transaction: any,
  expectedType: string,
  expectedResult: 'APPROVED' | 'DECLINED',
  expectedAmount: number
) {
  // Core required fields
  expect(transaction).toBeDefined();
  expect(typeof transaction.id).toBe('number');
  expect(typeof transaction.transactionId).toBe('string');
  expect(transaction.transactionId).toBeTruthy();

  // Transaction details
  expect(transaction.transactionType).toBe(expectedType);
  expect(transaction.transactionResult).toBe(expectedResult);
  expect(typeof transaction.transactionSuccess).toBe('boolean');
  expect(transaction.transactionSuccess).toBe(expectedResult === 'APPROVED');

  // Amount and currency
  expect(typeof transaction.amount).toBe('number');
  expect(transaction.amount).toBe(expectedAmount);
  expect(typeof transaction.currency).toBe('string');

  // Timestamps
  expect(typeof transaction.transactionTime).toBe('number');
  expect(transaction.transactionTime).toBeGreaterThan(0);

  // Test mode flag
  expect(typeof transaction.testMode).toBe('boolean');

  // Optional fields should have correct types when present
  if (transaction.cardType) expect(typeof transaction.cardType).toBe('string');
  if (transaction.cardSuffix)
    expect(typeof transaction.cardSuffix).toBe('number');
  if (transaction.cardExpiry)
    expect(typeof transaction.cardExpiry).toBe('string');
  if (transaction.userId) expect(typeof transaction.userId).toBe('number');
  if (transaction.lookupId) expect(typeof transaction.lookupId).toBe('number');
  if (transaction.amountRefunded)
    expect(typeof transaction.amountRefunded).toBe('number');
  if (transaction.amountTip)
    expect(typeof transaction.amountTip).toBe('number');
  if (transaction.amountTax)
    expect(typeof transaction.amountTax).toBe('number');
  if (transaction.captured !== undefined)
    expect(typeof transaction.captured).toBe('boolean');

  // Customer information fields
  if (transaction.email) expect(typeof transaction.email).toBe('string');
  if (transaction.firstName)
    expect(typeof transaction.firstName).toBe('string');
  if (transaction.lastName) expect(typeof transaction.lastName).toBe('string');
  if (transaction.company) expect(typeof transaction.company).toBe('string');
  if (transaction.telephone)
    expect(typeof transaction.telephone).toBe('string');

  // Address fields
  if (transaction.address1) expect(typeof transaction.address1).toBe('string');
  if (transaction.address2) expect(typeof transaction.address2).toBe('string');
  if (transaction.city) expect(typeof transaction.city).toBe('string');
  if (transaction.province) expect(typeof transaction.province).toBe('string');
  if (transaction.country) expect(typeof transaction.country).toBe('string');
  if (transaction.postalCode)
    expect(typeof transaction.postalCode).toBe('string');

  // System fields
  if (transaction.invoiceId)
    expect(typeof transaction.invoiceId).toBe('string');
  if (transaction.processorAuthCode)
    expect(typeof transaction.processorAuthCode).toBe('string');
  if (transaction.processorTransactionId)
    expect(typeof transaction.processorTransactionId).toBe('string');
  if (transaction.transactionSource) {
    expect([
      'VT',
      'MOBILE',
      'TABLET_POS',
      'E_COMMERCE',
      'RECURRING',
      'INVOICE',
    ]).toContain(transaction.transactionSource);
  }
}

describeIntegration('TransactionService Comprehensive Tests', () => {
  let sdk: PayHQSDK;
  let transactionService: TransactionService;
  const createdTransactionIds: number[] = [];

  beforeAll(async () => {
    sdk = new PayHQSDK(TEST_CONFIG);
    await sdk.initialize();
    transactionService = sdk.transactions;
  }, TEST_TIMEOUT);

  afterAll(async () => {
    console.log(
      `Created ${createdTransactionIds.length} test transactions:`,
      createdTransactionIds
    );
  });

  describe('Sale Transactions', () => {
    test(
      'should create approved sale with correct response structure',
      async () => {
        const invoiceId = `TEST-SALE-${Date.now()}`;

        const transaction = await transactionService.createSale({
          amount: TEST_AMOUNTS.APPROVED_SMALL,
          currency: 'CAD',
          card: {
            cardNumber: TEST_CARDS.VISA_APPROVED.number,
            cardExpiryMonth: TEST_CARDS.VISA_APPROVED.month,
            cardExpiryYear: TEST_CARDS.VISA_APPROVED.year,
            cvv2: TEST_CARDS.VISA_APPROVED.cvv,
          },
          description: `Invoice: ${invoiceId}`,
          testMode: true,
        });

        createdTransactionIds.push(transaction.id);

        // Validate complete response structure
        validateTransactionResponse(
          transaction,
          'SALE',
          'APPROVED',
          TEST_AMOUNTS.APPROVED_SMALL
        );

        // Check specific fields for sale transaction
        expect(transaction.testMode).toBe(true);

        // Card information should be present and masked
        expect(transaction.cardType).toBeTruthy();
        expect(transaction.cardSuffix).toBeDefined();
        expect(typeof transaction.cardSuffix).toBe('number');
        if (transaction.cardSuffix) {
          expect(transaction.cardSuffix.toString().length).toBe(4); // Last 4 digits
        }
      },
      TEST_TIMEOUT
    );

    test(
      'should create declined sale with correct response structure',
      async () => {
        const invoiceId = `TEST-DECLINED-${Date.now()}`;

        const transaction = await transactionService.createSale({
          amount: TEST_AMOUNTS.DECLINED_SMALL,
          currency: 'CAD',
          card: {
            cardNumber: TEST_CARDS.VISA_APPROVED.number,
            cardExpiryMonth: TEST_CARDS.VISA_APPROVED.month,
            cardExpiryYear: TEST_CARDS.VISA_APPROVED.year,
            cvv2: TEST_CARDS.VISA_APPROVED.cvv,
          },
          description: `Declined Invoice: ${invoiceId}`,
          testMode: true,
        });

        createdTransactionIds.push(transaction.id);

        // Validate complete response structure
        validateTransactionResponse(
          transaction,
          'SALE',
          'DECLINED',
          TEST_AMOUNTS.DECLINED_SMALL
        );

        expect(transaction.invoiceId).toBe(invoiceId);
        expect(transaction.testMode).toBe(true);
      },
      TEST_TIMEOUT
    );

    test(
      'should process quickSale with complete customer information',
      async () => {
        const transaction = await transactionService.createSale({
          amount: TEST_AMOUNTS.APPROVED_MEDIUM,
          currency: 'CAD',
          card: {
            cardNumber: TEST_CARDS.MASTERCARD_APPROVED.number,
            cardExpiryMonth: TEST_CARDS.MASTERCARD_APPROVED.month,
            cardExpiryYear: TEST_CARDS.MASTERCARD_APPROVED.year,
            cvv2: TEST_CARDS.MASTERCARD_APPROVED.cvv,
          },
          // Customer information
          email: 'test@example.com',
          firstName: 'John',
          lastName: 'Doe',
          company: 'Test Company',
          telephone: '555-123-4567',
          // Address information
          address1: '123 Test Street',
          address2: 'Suite 100',
          city: 'Vancouver',
          province: 'BC',
          country: 'Canada',
          postalCode: 'V6B 1A1',
          testMode: true,
        });

        createdTransactionIds.push(transaction.id);

        validateTransactionResponse(
          transaction,
          'SALE',
          'APPROVED',
          TEST_AMOUNTS.APPROVED_MEDIUM
        );

        // Verify customer information is preserved
        expect(transaction.email).toBe('test@example.com');
        expect(transaction.firstName).toBe('John');
        expect(transaction.lastName).toBe('Doe');
        expect(transaction.company).toBe('Test Company');
        expect(transaction.telephone).toBe('555-123-4567');
        expect(transaction.address1).toBe('123 Test Street');
        expect(transaction.address2).toBe('Suite 100');
        expect(transaction.city).toBe('Vancouver');
        expect(transaction.province).toBe('BC');
        expect(transaction.country).toBe('Canada');
        expect(transaction.postalCode).toBe('V6B 1A1');
      },
      TEST_TIMEOUT
    );
  });

  describe('Authorization Transactions', () => {
    test(
      'should create approved authorization with correct type',
      async () => {
        const transaction = await transactionService.createAuthorization({
          amount: TEST_AMOUNTS.APPROVED_LARGE,
          currency: 'CAD',
          card: {
            cardNumber: TEST_CARDS.VISA_APPROVED.number,
            cardExpiryMonth: TEST_CARDS.VISA_APPROVED.month,
            cardExpiryYear: TEST_CARDS.VISA_APPROVED.year,
            cvv2: TEST_CARDS.VISA_APPROVED.cvv,
          },
          testMode: true,
        });

        createdTransactionIds.push(transaction.id);

        // Note: PayFirma API returns 'AUTHORIZATION' not 'AUTHORIZE'
        validateTransactionResponse(
          transaction,
          'AUTHORIZATION',
          'APPROVED',
          TEST_AMOUNTS.APPROVED_LARGE
        );

        // Authorization specific checks
        expect(transaction.captured).toBe(false); // Should not be captured yet
      },
      TEST_TIMEOUT
    );

    test(
      'should create declined authorization',
      async () => {
        const transaction = await transactionService.createAuthorization({
          amount: TEST_AMOUNTS.DECLINED_LARGE,
          currency: 'CAD',
          card: {
            cardNumber: TEST_CARDS.VISA_APPROVED.number,
            cardExpiryMonth: TEST_CARDS.VISA_APPROVED.month,
            cardExpiryYear: TEST_CARDS.VISA_APPROVED.year,
            cvv2: TEST_CARDS.VISA_APPROVED.cvv,
          },
          testMode: true,
        });

        createdTransactionIds.push(transaction.id);

        validateTransactionResponse(
          transaction,
          'AUTHORIZATION',
          'DECLINED',
          TEST_AMOUNTS.DECLINED_LARGE
        );
      },
      TEST_TIMEOUT
    );
  });

  describe('Capture Transactions', () => {
    let approvedAuthTransaction: any;

    beforeAll(async () => {
      // Create an approved authorization to capture
      approvedAuthTransaction = await transactionService.createAuthorization({
        amount: TEST_AMOUNTS.APPROVED_LARGE,
        currency: 'CAD',
        card: {
          cardNumber: TEST_CARDS.VISA_APPROVED.number,
          cardExpiryMonth: TEST_CARDS.VISA_APPROVED.month,
          cardExpiryYear: TEST_CARDS.VISA_APPROVED.year,
          cvv2: TEST_CARDS.VISA_APPROVED.cvv,
        },
        testMode: true,
      });
      createdTransactionIds.push(approvedAuthTransaction.id);

      // Wait for authorization to be processed
      await new Promise(resolve => setTimeout(resolve, 2000));
    }, TEST_TIMEOUT);

    test(
      'should capture approved authorization',
      async () => {
        const captureAmount = TEST_AMOUNTS.APPROVED_MEDIUM; // Partial capture

        const captureTransaction = await transactionService.captureTransaction(
          approvedAuthTransaction.id, // Use numeric ID for API operations
          {
            amount: captureAmount,
            testMode: true,
          }
        );

        createdTransactionIds.push(captureTransaction.id);

        validateTransactionResponse(
          captureTransaction,
          'CAPTURE',
          'APPROVED',
          captureAmount
        );

        // Capture specific checks
        expect(captureTransaction.captured).toBe(true);
      },
      TEST_TIMEOUT
    );
  });

  describe('Refund Transactions', () => {
    test('should process refund with correct response structure', async () => {
      // Create an approved sale to refund
      const saleTransaction = await transactionService.createSale({
        amount: TEST_AMOUNTS.APPROVED_LARGE,
        currency: 'CAD',
        card: {
          cardNumber: TEST_CARDS.MASTERCARD_APPROVED.number,
          cardExpiryMonth: TEST_CARDS.MASTERCARD_APPROVED.month,
          cardExpiryYear: TEST_CARDS.MASTERCARD_APPROVED.year,
          cvv2: TEST_CARDS.MASTERCARD_APPROVED.cvv,
        },
        testMode: true,
      });
      createdTransactionIds.push(saleTransaction.id);

      const refundAmount = TEST_AMOUNTS.APPROVED_SMALL; // Partial refund
      const refundTransaction = await transactionService.refundTransaction(
        saleTransaction.id, // Use numeric ID for API operations
        {
          amount: refundAmount,
          description: 'Test refund',
          testMode: true,
        }
      );
      createdTransactionIds.push(refundTransaction.id);

      validateTransactionResponse(
        refundTransaction,
        'REFUND',
        'APPROVED',
        refundAmount
      );
    }, 30000);
  });

  describe('Transaction Retrieval and Validation', () => {
    let testTransaction: any;

    beforeAll(async () => {
      testTransaction = await transactionService.createSale({
        amount: TEST_AMOUNTS.APPROVED_SMALL,
        currency: 'CAD',
        card: {
          cardNumber: TEST_CARDS.VISA_APPROVED.number,
          cardExpiryMonth: TEST_CARDS.VISA_APPROVED.month,
          cardExpiryYear: TEST_CARDS.VISA_APPROVED.year,
          cvv2: TEST_CARDS.VISA_APPROVED.cvv,
        },
        email: 'retrieve-test@example.com',
        firstName: 'Retrieve',
        lastName: 'Test',
        testMode: true,
      });
      createdTransactionIds.push(testTransaction.id);
    }, TEST_TIMEOUT);

    test(
      'should retrieve transaction with complete structure',
      async () => {
        const retrievedTransaction = await transactionService.getTransaction(
          testTransaction.transactionId
        );

        validateTransactionResponse(
          retrievedTransaction,
          'SALE',
          'APPROVED',
          TEST_AMOUNTS.APPROVED_SMALL
        );

        // Verify consistency with original transaction
        expect(retrievedTransaction.id).toBe(testTransaction.id);
        expect(retrievedTransaction.transactionId).toBe(
          testTransaction.transactionId
        );
        expect(retrievedTransaction.amount).toBe(testTransaction.amount);
        expect(retrievedTransaction.currency).toBe(testTransaction.currency);
        expect(retrievedTransaction.email).toBe('retrieve-test@example.com');
        expect(retrievedTransaction.firstName).toBe('Retrieve');
        expect(retrievedTransaction.lastName).toBe('Test');
      },
      TEST_TIMEOUT
    );

    test(
      'should list transactions with proper pagination structure',
      async () => {
        const response = await transactionService.listTransactions({
          limit: 5,
        });

        expect(response).toBeDefined();
        expect(Array.isArray(response.entities)).toBe(true);
        expect(response.entities.length).toBeGreaterThan(0);
        expect(response.entities.length).toBeLessThanOrEqual(5);

        // Validate each transaction in the list
        response.entities.forEach(transaction => {
          expect(typeof transaction.id).toBe('number');
          expect(typeof transaction.transactionId).toBe('string');
          expect([
            'SALE',
            'AUTHORIZATION',
            'CAPTURE',
            'REFUND',
            'VOID',
          ]).toContain(transaction.transactionType);
          expect([
            'APPROVED',
            'DECLINED',
            'PENDING',
            'CANCELLED',
            'FAILED',
          ]).toContain(transaction.transactionResult);
          expect(typeof transaction.amount).toBe('number');
          expect(typeof transaction.transactionSuccess).toBe('boolean');
        });

        // Check pagination structure
        if (response.paging) {
          expect(typeof response.paging).toBe('object');
          if (response.paging.cursors) {
            expect(typeof response.paging.cursors).toBe('object');
          }
        }
      },
      TEST_TIMEOUT
    );
  });

  describe('Search and Filter Methods', () => {
    test(
      'should get transactions by status with correct filtering',
      async () => {
        const approvedTransactions =
          await transactionService.getTransactionsByStatus('APPROVED');
        const declinedTransactions =
          await transactionService.getTransactionsByStatus('DECLINED');

        expect(Array.isArray(approvedTransactions)).toBe(true);
        expect(Array.isArray(declinedTransactions)).toBe(true);

        // Verify all approved transactions are actually approved
        approvedTransactions.forEach(transaction => {
          expect(transaction.transactionResult).toBe('APPROVED');
          expect(transaction.transactionSuccess).toBe(true);
        });

        // Verify all declined transactions are actually declined
        declinedTransactions.forEach(transaction => {
          expect(transaction.transactionResult).toBe('DECLINED');
          expect(transaction.transactionSuccess).toBe(false);
        });
      },
      TEST_TIMEOUT
    );

    test(
      'should get transactions by amount range',
      async () => {
        const transactions =
          await transactionService.getTransactionsByAmountRange(
            TEST_AMOUNTS.APPROVED_SMALL,
            TEST_AMOUNTS.APPROVED_LARGE
          );

        expect(Array.isArray(transactions)).toBe(true);

        // Verify all transactions are within the specified range
        transactions.forEach(transaction => {
          expect(transaction.amount).toBeGreaterThanOrEqual(
            TEST_AMOUNTS.APPROVED_SMALL
          );
          expect(transaction.amount).toBeLessThanOrEqual(
            TEST_AMOUNTS.APPROVED_LARGE
          );
        });
      },
      TEST_TIMEOUT
    );
  });

  describe('Error Handling and Edge Cases', () => {
    test(
      'should handle invalid transaction ID gracefully',
      async () => {
        await expect(
          transactionService.getTransaction('invalid-transaction-id')
        ).rejects.toThrow();
      },
      TEST_TIMEOUT
    );

    test(
      'should handle invalid card number',
      async () => {
        await expect(
          transactionService.createSale({
            amount: TEST_AMOUNTS.APPROVED_SMALL,
            currency: 'CAD',
            card: {
              cardNumber: '1234567890123456', // Invalid card number
              cardExpiryMonth: 12,
              cardExpiryYear: 25,
              cvv2: '123',
            },
            testMode: true,
          })
        ).rejects.toThrow();
      },
      TEST_TIMEOUT
    );

    test(
      'should handle zero amount correctly',
      async () => {
        // Zero amount transactions (for tokenization) should work
        const transaction = await transactionService.createSale({
          amount: 0,
          currency: 'CAD',
          card: {
            cardNumber: TEST_CARDS.VISA_APPROVED.number,
            cardExpiryMonth: TEST_CARDS.VISA_APPROVED.month,
            cardExpiryYear: TEST_CARDS.VISA_APPROVED.year,
            cvv2: TEST_CARDS.VISA_APPROVED.cvv,
          },
          testMode: true,
        });

        createdTransactionIds.push(transaction.id);

        expect(transaction.amount).toBe(0);
        expect(typeof transaction.transactionResult).toBe('string');
      },
      TEST_TIMEOUT
    );
  });

  describe('Transaction Summary and Reporting', () => {
    test(
      'should generate transaction summary with correct structure',
      async () => {
        const summary = await transactionService.getTransactionSummary({
          limit: 20,
        });

        expect(summary).toBeDefined();
        expect(typeof summary.total_count).toBe('number');
        expect(typeof summary.total_amount).toBe('number');
        expect(typeof summary.currency).toBe('string');
        expect(summary.status_breakdown).toBeDefined();
        expect(summary.type_breakdown).toBeDefined();

        // Verify status breakdown structure
        expect(typeof summary.status_breakdown.approved).toBe('number');
        expect(typeof summary.status_breakdown.declined).toBe('number');
        expect(typeof summary.status_breakdown.pending).toBe('number');

        // Verify type breakdown structure
        expect(typeof summary.type_breakdown.sales).toBe('number');
        expect(typeof summary.type_breakdown.authorizations).toBe('number');
        expect(typeof summary.type_breakdown.captures).toBe('number');
        expect(typeof summary.type_breakdown.refunds).toBe('number');
        expect(typeof summary.type_breakdown.voids).toBe('number');
      },
      TEST_TIMEOUT
    );
  });
});
