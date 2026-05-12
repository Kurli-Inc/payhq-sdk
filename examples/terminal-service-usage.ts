/**
 * Terminal Service Usage Examples
 * Demonstrates proper usage of PAYHQ Terminal API with processorId per operation
 * Only includes endpoints documented in PAYHQ Terminals API documentation
 */

import { PayHQSDK } from '../src/PayHQSDK';

async function terminalServiceExamples() {
  const sdk = new PayHQSDK({
    clientId: 'your-client-id',
    clientSecret: 'your-client-secret',
    sandbox: true,
  });

  try {
    // Example 1: Sale with Customer Lookup
    console.log('=== Sale with Customer Lookup ===');
    const saleWithCustomerResult = await sdk.terminals.saleWithCustomer({
      customerLookupId: 'customer-12345',
      amount: 50.0,
      currency: 'CAD',
      processorId: 123456, // Terminal-specific processor ID
      firstName: 'John',
      lastName: 'Doe',
      company: 'Acme Corp',
      email: 'john.doe@example.com',
      orderId: 'ORDER-12345',
      invoiceId: 'INV-12345',
      description: 'Coffee purchase',
    });

    console.log('Transaction ID:', saleWithCustomerResult.transactionId);
    console.log('Transaction Type:', saleWithCustomerResult.transactionType);
    console.log('Success:', saleWithCustomerResult.transactionSuccess);

    // Example 2: Sale without Customer Lookup
    console.log('\n=== Sale without Customer Lookup ===');
    const saleResult = await sdk.terminals.sale({
      amount: 25.99,
      currency: 'CAD',
      processorId: 789012, // Different terminal processor ID
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane.smith@example.com',
      telephone: '555-1234',
      address1: '123 Main St',
      city: 'Vancouver',
      province: 'BC',
      country: 'CA',
      postalCode: 'V6B 1A1',
      orderId: 'ORDER-67890',
      invoiceId: 'INV-67890',
      description: 'Product purchase',
    });

    console.log('Transaction ID:', saleResult.transactionId);
    console.log('Card Type:', saleResult.cardType);
    console.log('Card Suffix:', saleResult.cardSuffix);

    // Example 3: Authorization
    console.log('\n=== Authorization ===');
    const authResult = await sdk.terminals.authorize({
      amount: 100.0,
      currency: 'CAD',
      processorId: 345678, // Authorization terminal processor ID
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane.smith@example.com',
      orderId: 'ORDER-AUTH-001',
      invoiceId: 'INV-AUTH-001',
      description: 'Authorization hold',
    });

    console.log('Authorization ID:', authResult.transactionId);
    console.log('Authorization Success:', authResult.transactionSuccess);

    // Example 4: Capture Authorization
    console.log('\n=== Capture Authorization ===');
    const captureResult = await sdk.terminals.capture(
      authResult.transactionId,
      {
        amount: 75.0, // Partial capture
        currency: 'CAD',
        processorId: 345678, // Same processor ID as authorization
        invoiceId: 'INV-CAPTURE-001',
      }
    );

    console.log('Capture ID:', captureResult.transactionId);
    console.log('Captured Amount:', captureResult.amount);

    // Example 5: Refund
    console.log('\n=== Refund ===');
    const refundResult = await sdk.terminals.refund({
      originalTransactionId: saleResult.transactionId,
      amount: 10.0, // Partial refund
      currency: 'CAD',
      processorId: 789012, // Same processor ID as original sale
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane.smith@example.com',
    });

    console.log('Refund ID:', refundResult.transactionId);
    console.log('Refund Amount:', refundResult.amount);

    console.log('\n=== All Terminal Examples Completed Successfully! ===');
  } catch (error: any) {
    console.error('Terminal operation failed:', error.message);
    console.error('Error details:', error.details || error);
  }
}

// Key Benefits of CamelCase Types:

/**
 * 1. CONSISTENT NAMING CONVENTION ✅
 * All properties use camelCase, matching TypeScript conventions
 *
 * Before: customer_lookup_id, send_receipt, terminal_id
 * After:  customerLookupId, sendReceipt, terminalId
 */

/**
 * 2. BETTER INTELLISENSE ✅
 * IDE autocompletion works better with consistent naming
 * No confusion between snake_case and camelCase
 */

/**
 * 3. AUTOMATIC TRANSFORMATION ✅
 * Developer uses: customerLookupId (camelCase)
 * API receives: customer_lookup_id (snake_case)
 * Response returns: transactionId (camelCase)
 */

/**
 * 4. TYPE SAFETY ✅
 * Full TypeScript validation
 * Compile-time property checking
 * No runtime property name errors
 */

export { terminalServiceExamples };
