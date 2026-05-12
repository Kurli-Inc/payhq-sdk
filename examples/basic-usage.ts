/**
 * Comprehensive usage example for the PayHQ SDK
 * This example demonstrates all major features of the SDK
 */

import { PayHQSDK } from '../src';

// Example usage demonstrating transaction types and common flows
async function main() {
  const sdk = new PayHQSDK({
    clientId: 'your-client-id',
    clientSecret: 'your-client-secret',
    sandbox: true, // Use sandbox instead of environment
    // debug: true, // Optional: enable redacted request/response logging
  });

  try {
    // Initialize the SDK
    await sdk.initialize();

    console.log('PayHQ SDK initialized successfully!');

    // Example 1: Create a simple sale transaction
    console.log('\n--- Creating a Sale Transaction ---');
    const saleResult = await sdk.transactions.createSale({
      amount: 10.99,
      currency: 'CAD',
      card: {
        cardNumber: '4111111111111111',
        cardExpiryMonth: 12,
        cardExpiryYear: 25,
        cvv2: '123',
      },
      email: 'customer@example.com',
      firstName: 'John',
      lastName: 'Doe',
      testMode: true,
    });

    console.log('Sale transaction created:', {
      id: saleResult.id,
      transactionId: saleResult.transactionId,
      transactionType: saleResult.transactionType,
      transactionSuccess: saleResult.transactionSuccess,
      transactionResult: saleResult.transactionResult,
      amount: saleResult.amount,
      currency: saleResult.currency,
      cardType: saleResult.cardType,
      cardSuffix: saleResult.cardSuffix, // This is now correctly typed as number
      email: saleResult.email,
      firstName: saleResult.firstName,
      lastName: saleResult.lastName,
      testMode: saleResult.testMode,
    });

    // Example 2: Get transaction details
    console.log('\n--- Retrieving Transaction Details ---');
    if (!saleResult.transactionId) {
      throw new Error('Transaction ID not returned from PayHQ API');
    }
    const transaction = await sdk.transactions.getTransaction(
      saleResult.transactionId
    );

    console.log('Retrieved transaction:', {
      id: transaction.id,
      transactionId: transaction.transactionId,
      transactionResult: transaction.transactionResult,
      amount: transaction.amount,
      currency: transaction.currency,
      // Additional transaction fields:
      amountRefunded: transaction.amountRefunded,
      amountTip: transaction.amountTip,
      amountTax: transaction.amountTax,
      captured: transaction.captured,
      userId: transaction.userId,
      transactionSource: transaction.transactionSource,
      lookupId: transaction.lookupId,
      processorAuthCode: transaction.processorAuthCode,
      processorTransactionId: transaction.processorTransactionId,
    });

    // Example 3: List transactions with proper search parameters
    console.log('\n--- Listing Transactions with Filters ---');
    const transactionList = await sdk.transactions.listTransactions({
      limit: 10,
      status: 'APPROVED', // TransactionListFilterStatus
      fromDate: '2024-01-01', // Proper date format for API
      toDate: '2024-12-31',
      channel: 'E_COMMERCE',
      amountMin: 1.0,
      amountMax: 100.0,
      email: 'customer@example.com',
    });

    console.log(`Found ${transactionList.entities.length} transactions`);

    if (transactionList.entities.length > 0) {
      const firstTransaction = transactionList.entities[0];
      if (firstTransaction) {
        console.log('First transaction details:', {
          id: firstTransaction.id,
          transactionId: firstTransaction.transactionId,
          transactionType: firstTransaction.transactionType,
          transactionResult: firstTransaction.transactionResult,
          transactionSource: firstTransaction.transactionSource,
          amount: firstTransaction.amount,
          currency: firstTransaction.currency,
          cardType: firstTransaction.cardType,
          cardSuffix: firstTransaction.cardSuffix, // number type
          cardExpiry: firstTransaction.cardExpiry, // MM/YY format
          email: firstTransaction.email,
          firstName: firstTransaction.firstName,
          lastName: firstTransaction.lastName,
          company: firstTransaction.company,
          telephone: firstTransaction.telephone,
          address1: firstTransaction.address1,
          city: firstTransaction.city,
          province: firstTransaction.province,
          country: firstTransaction.country,
          postalCode: firstTransaction.postalCode,
          invoiceId: firstTransaction.invoiceId,
          testMode: firstTransaction.testMode,
        });
      }
    }

    // Example 4: Customer management
    console.log('\n--- Creating Customer ---');
    const customer = await sdk.customers.createCustomer({
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane.smith@example.com',
      telephone: '555-0123',
      address1: '123 Main St',
      city: 'Vancouver',
      province: 'BC',
      country: 'Canada',
      postalCode: 'V6B 1A1',
    });

    console.log('Customer created:', {
      lookupId: customer.lookupId,
      firstName: customer.firstName,
      lastName: customer.lastName,
      email: customer.email,
    });

    console.log('\n--- All examples completed successfully! ---');
  } catch (error) {
    console.error('Error:', error);

    // Enhanced error handling with proper typing
    if (error && typeof error === 'object' && 'code' in error) {
      console.error('Error Code:', (error as any).code);
      console.error('Error Message:', (error as any).message);
      console.error('Status Code:', (error as any).statusCode);
    }
  }
}

// Run the example
if (require.main === module) {
  main().catch(console.error);
}
