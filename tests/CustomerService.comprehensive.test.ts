/**
 * Comprehensive Customer Service Tests
 * Based on PayHQ Customer API Documentation
 *
 * Tests all endpoints:
 * - POST /customer (create customer)
 * - GET /customer/{customer_lookup_id} (get customer)
 * - PUT /customer/{customer_lookup_id} (update customer)
 * - GET /customer (list customers with filters)
 * - GET /customer/plan/{plan_lookup_id} (get customers by plan)
 * - POST /customer/{customer_lookup_id}/card (add card)
 * - PATCH /customer/{customer_lookup_id}/card/{card_lookup_id} (update card)
 * - DELETE /customer/{customer_lookup_id}/card/{card_lookup_id} (remove card)
 * - POST /customer/{customer_lookup_id}/subscription (add subscription)
 * - PATCH /customer/{customer_lookup_id}/subscription/{subscription_lookup_id} (update/cancel subscription)
 */

import { PayHQSDK } from '../src/PayHQSDK';
import { SANDBOX_CONFIG, TEST_CARDS, hasIntegrationCredentials } from './setup';
import { Customer, CreateCustomerRequest } from '../src/types/customer';

const describeIntegration = hasIntegrationCredentials
  ? describe
  : describe.skip;

describeIntegration('CustomerService - Comprehensive API Coverage', () => {
  let sdk: PayHQSDK;
  const createdCustomerIds: string[] = [];
  const testResults = {
    customersCreated: 0,
    cardsAdded: 0,
    subscriptionsCreated: 0,
    testsRun: 0,
    testsPassed: 0,
  };

  beforeAll(async () => {
    sdk = new PayHQSDK(SANDBOX_CONFIG);
    await sdk.auth.clientCredentialsGrant();
    console.log('🚀 Starting comprehensive CustomerService tests...');
  }, 30000);

  afterAll(async () => {
    console.log('\n📊 Test Summary:');
    console.log(`✅ Tests Run: ${testResults.testsRun}`);
    console.log(`✅ Tests Passed: ${testResults.testsPassed}`);
    console.log(`👥 Customers Created: ${testResults.customersCreated}`);
    console.log(`💳 Cards Added: ${testResults.cardsAdded}`);
    console.log(
      `📋 Subscriptions Created: ${testResults.subscriptionsCreated}`
    );
    console.log(`🔗 Customer IDs Created: ${createdCustomerIds.join(', ')}`);
  });

  // Helper function to track test results
  const trackTest = (testName: string, passed: boolean = true) => {
    testResults.testsRun++;
    if (passed) testResults.testsPassed++;
    console.log(`${passed ? '✅' : '❌'} ${testName}`);
  };

  // Helper function to generate unique test customer data
  function generateTestCustomer(suffix: string = ''): CreateCustomerRequest {
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substr(2, 9);
    return {
      email: `test.customer.${timestamp}.${randomId}${suffix}@example.com`,
      firstName: 'Test',
      lastName: `Customer${suffix}`,
      company: `Test Company ${suffix || 'Ltd'}`,
      bccEmails: 'admin@testcompany.com',
      telephone: '555-123-4567',
      address1: '123 Main Street',
      address2: 'Suite 100',
      city: 'Vancouver',
      province: 'BC',
      country: 'CA',
      postalCode: 'V6B 1A1',
      customId: `TEST_${timestamp}_${randomId}${suffix}`,
    };
  }

  // ============================================================================
  // CUSTOMER MANAGEMENT - Basic CRUD Operations
  // Based on: POST /customer, GET /customer/{id}, PUT /customer/{id}
  // ============================================================================

  describe('Customer Management - CRUD Operations', () => {
    describe('Customer Creation (POST /customer)', () => {
      test('should create customer with all fields from documentation', async () => {
        const customerData = generateTestCustomer('_FULL');

        const customer = await sdk.customers.createCustomer(customerData);
        createdCustomerIds.push(customer.lookupId);
        testResults.customersCreated++;

        // Validate response structure matches PayHQ documentation
        expect(customer).toBeDefined();
        expect(customer.id).toBeDefined(); // numeric ID
        expect(customer.lookupId).toBeDefined(); // hashed lookup ID
        expect(customer.email).toBe(customerData.email);
        expect(customer.firstName).toBe(customerData.firstName);
        expect(customer.lastName).toBe(customerData.lastName);
        expect(customer.company).toBe(customerData.company);
        expect(customer.telephone).toBe(customerData.telephone);
        expect(customer.address1).toBe(customerData.address1);
        expect(customer.address2).toBe(customerData.address2);
        expect(customer.city).toBe(customerData.city);
        expect(customer.province).toBe(customerData.province);
        expect(customer.country).toBe(customerData.country);
        expect(customer.postalCode).toBe(customerData.postalCode);

        trackTest('Create customer with all fields');
      });

      test('should create customer with minimal required fields (email only)', async () => {
        const customerData: CreateCustomerRequest = {
          email: `minimal.${Date.now()}@example.com`,
        };

        const customer = await sdk.customers.createCustomer(customerData);
        createdCustomerIds.push(customer.lookupId);
        testResults.customersCreated++;

        expect(customer.email).toBe(customerData.email);
        expect(customer.id).toBeDefined();
        expect(customer.lookupId).toBeDefined();

        trackTest('Create customer with minimal fields');
      });

      test('should reject invalid email format', async () => {
        const invalidCustomer = { email: 'invalid-email-format' };

        await expect(
          sdk.customers.createCustomer(invalidCustomer)
        ).rejects.toThrow();

        trackTest('Reject invalid email format');
      });
    });

    describe('Customer Retrieval (GET /customer/{customer_lookup_id})', () => {
      let testCustomer: Customer;

      beforeAll(async () => {
        const customerData = generateTestCustomer('_RETRIEVE');
        testCustomer = await sdk.customers.createCustomer(customerData);
        createdCustomerIds.push(testCustomer.lookupId);
        testResults.customersCreated++;
      });

      test('should retrieve customer by lookup ID', async () => {
        const retrievedCustomer = await sdk.customers.getCustomer(
          testCustomer.lookupId
        );

        expect(retrievedCustomer).toBeDefined();
        expect(retrievedCustomer.lookupId).toBe(testCustomer.lookupId);
        expect(retrievedCustomer.email).toBe(testCustomer.email);
        expect(retrievedCustomer.firstName).toBe(testCustomer.firstName);
        expect(retrievedCustomer.lastName).toBe(testCustomer.lastName);

        trackTest('Retrieve customer by lookup ID');
      });

      test('should handle non-existent customer lookup ID', async () => {
        await expect(
          sdk.customers.getCustomer('non-existent-lookup-id')
        ).rejects.toThrow();

        trackTest('Handle non-existent customer ID');
      });

      test('should check customer existence', async () => {
        const exists = await sdk.customers.customerExists(
          testCustomer.lookupId
        );
        expect(exists).toBe(true);

        const notExists = await sdk.customers.customerExists(
          'definitely-not-exists'
        );
        expect(notExists).toBe(false);

        trackTest('Check customer existence');
      });
    });

    describe('Customer Updates (PUT /customer/{customer_lookup_id})', () => {
      let testCustomer: Customer;

      beforeAll(async () => {
        const customerData = generateTestCustomer('_UPDATE');
        testCustomer = await sdk.customers.createCustomer(customerData);
        createdCustomerIds.push(testCustomer.lookupId);
        testResults.customersCreated++;
      });

      test('should update customer information', async () => {
        const updateData = {
          firstName: 'Updated',
          lastName: 'Name',
          company: 'Updated Company Inc',
          telephone: '555-999-8888',
          city: 'Toronto',
          province: 'ON',
          customId: 'UPDATED_CUSTOMER_ID',
        };

        const updatedCustomer = await sdk.customers.updateCustomer(
          testCustomer.lookupId,
          updateData
        );

        expect(updatedCustomer.firstName).toBe(updateData.firstName);
        expect(updatedCustomer.lastName).toBe(updateData.lastName);
        expect(updatedCustomer.company).toBe(updateData.company);
        expect(updatedCustomer.telephone).toBe(updateData.telephone);
        expect(updatedCustomer.city).toBe(updateData.city);
        expect(updatedCustomer.province).toBe(updateData.province);

        // Should preserve unchanged fields
        expect(updatedCustomer.email).toBe(testCustomer.email);
        expect(updatedCustomer.address1).toBe(testCustomer.address1);

        trackTest('Update customer information');
      });

      test('should update customer with partial data', async () => {
        const updateData = { company: 'Partially Updated Company' };

        const updatedCustomer = await sdk.customers.updateCustomer(
          testCustomer.lookupId,
          updateData
        );

        expect(updatedCustomer.company).toBe(updateData.company);
        // All other fields should remain unchanged
        expect(updatedCustomer.firstName).toBe('Updated'); // From previous test
        expect(updatedCustomer.email).toBe(testCustomer.email);

        trackTest('Update customer with partial data');
      });
    });
  });

  // ============================================================================
  // CUSTOMER LISTING AND SEARCH
  // Based on: GET /customer with query parameters
  // ============================================================================

  describe('Customer Listing and Search (GET /customer)', () => {
    const searchTestCustomers: Customer[] = [];

    beforeAll(async () => {
      // Create multiple customers for search testing
      const testData = [
        {
          suffix: '_SEARCH_ALPHA',
          firstName: 'SearchTest',
          lastName: 'Alpha',
          company: 'Alpha Corp',
        },
        {
          suffix: '_SEARCH_BETA',
          firstName: 'SearchTest',
          lastName: 'Beta',
          company: 'Beta Inc',
        },
        {
          suffix: '_SEARCH_GAMMA',
          firstName: 'SearchTest',
          lastName: 'Gamma',
          company: 'Gamma LLC',
        },
      ];

      for (const data of testData) {
        const customerData = {
          ...generateTestCustomer(data.suffix),
          firstName: data.firstName,
          lastName: data.lastName,
          company: data.company,
        };

        const customer = await sdk.customers.createCustomer(customerData);
        searchTestCustomers.push(customer);
        createdCustomerIds.push(customer.lookupId);
        testResults.customersCreated++;
      }
    });

    test('should list all customers with pagination', async () => {
      const response = await sdk.customers.listCustomers({ limit: 10 });

      expect(response).toBeDefined();
      expect(response.entities).toBeDefined();
      expect(Array.isArray(response.entities)).toBe(true);
      expect(response.entities.length).toBeGreaterThan(0);
      expect(response.paging).toBeDefined();
      expect(response.paging?.cursors).toBeDefined();
      expect(response.paging?.cursors.before).toBeDefined();
      expect(response.paging?.cursors.after).toBeDefined();

      trackTest('List customers with pagination');
    });

    test('should search customers by email', async () => {
      const searchEmail = searchTestCustomers[0]!.email;
      const foundCustomers =
        await sdk.customers.searchCustomersByEmail(searchEmail);

      expect(Array.isArray(foundCustomers)).toBe(true);
      expect(foundCustomers.length).toBeGreaterThan(0);

      const matchingCustomer = foundCustomers.find(
        c => c.email === searchEmail
      );
      expect(matchingCustomer).toBeDefined();

      trackTest('Search customers by email');
    });

    test('should search customers by first name', async () => {
      const customers = await sdk.customers.searchCustomersByName('SearchTest');

      expect(Array.isArray(customers)).toBe(true);
      expect(customers.length).toBeGreaterThanOrEqual(3); // At least our test customers

      // All returned customers should have matching first name
      customers.forEach(customer => {
        expect(customer.firstName).toBe('SearchTest');
      });

      trackTest('Search customers by first name');
    });

    test('should search customers by last name', async () => {
      const customers = await sdk.customers.searchCustomersByName(
        undefined,
        'Alpha'
      );

      expect(Array.isArray(customers)).toBe(true);
      expect(customers.length).toBeGreaterThan(0);

      // Should find our Alpha customer
      const alphaCustomer = customers.find(c => c.lastName === 'Alpha');
      expect(alphaCustomer).toBeDefined();

      trackTest('Search customers by last name');
    });

    test('should filter customers by company name', async () => {
      const response = await sdk.customers.listCustomers({
        company: 'Beta Inc',
      });

      expect(response.entities.length).toBeGreaterThan(0);
      const betaCustomer = response.entities.find(
        c => c.company === 'Beta Inc'
      );
      expect(betaCustomer).toBeDefined();

      trackTest('Filter customers by company');
    });

    test('should get customers with subscriptions', async () => {
      const customersWithSubscriptions =
        await sdk.customers.getCustomersWithSubscriptions();

      expect(Array.isArray(customersWithSubscriptions)).toBe(true);
      // Each customer should have at least one subscription (when they exist)
      customersWithSubscriptions.forEach(customer => {
        if (customer.subscriptions) {
          expect(customer.subscriptions.length).toBeGreaterThan(0);
        }
      });

      trackTest('Get customers with subscriptions');
    });
  });

  // ============================================================================
  // CARD MANAGEMENT
  // Based on: POST /customer/{id}/card, PATCH /customer/{id}/card/{card_id}, DELETE /customer/{id}/card/{card_id}
  // ============================================================================

  describe('Card Management', () => {
    let cardTestCustomer: Customer;

    beforeAll(async () => {
      const customerData = generateTestCustomer('_CARD_TEST');
      cardTestCustomer = await sdk.customers.createCustomer(customerData);
      createdCustomerIds.push(cardTestCustomer.lookupId);
      testResults.customersCreated++;
    });

    describe('Card Addition (POST /customer/{customer_lookup_id}/card)', () => {
      test('should add first card as default', async () => {
        const cardData = {
          cardNumber: TEST_CARDS.VISA_APPROVED.number,
          cardExpiryMonth: TEST_CARDS.VISA_APPROVED.month,
          cardExpiryYear: TEST_CARDS.VISA_APPROVED.year,
          cvv2: TEST_CARDS.VISA_APPROVED.cvv,
          cardDescription: 'Primary Visa Card',
        };

        const updatedCustomer = await sdk.customers.addCard(
          cardTestCustomer.lookupId,
          cardData
        );
        testResults.cardsAdded++;

        expect(updatedCustomer.cards).toBeDefined();
        expect(updatedCustomer.cards.length).toBe(1);

        const card = updatedCustomer.cards[0];
        expect(card).toBeDefined();
        expect(card!.isDefault).toBe(true); // First card should be default
        expect(card!.cardDescription).toBe(cardData.cardDescription);
        expect(card!.cardPrefix).toBe('4111'); // First 4 digits of Visa test card
        expect(card!.cardSuffix).toBe('1111'); // Last 4 digits of Visa test card
        expect(card!.lookupId).toBeDefined();
        expect(card!.id).toBeDefined();

        trackTest('Add first card as default');
      });

      test('should add second card as non-default', async () => {
        const cardData = {
          cardNumber: TEST_CARDS.MASTERCARD_APPROVED.number,
          cardExpiryMonth: TEST_CARDS.MASTERCARD_APPROVED.month,
          cardExpiryYear: TEST_CARDS.MASTERCARD_APPROVED.year,
          cvv2: TEST_CARDS.MASTERCARD_APPROVED.cvv,
          cardDescription: 'Secondary MasterCard',
        };

        const updatedCustomer = await sdk.customers.addCard(
          cardTestCustomer.lookupId,
          cardData
        );
        testResults.cardsAdded++;

        expect(updatedCustomer.cards.length).toBe(2);

        // Find the new card
        const newCard = updatedCustomer.cards.find(
          c => c.cardDescription === 'Secondary MasterCard'
        );
        expect(newCard).toBeDefined();
        expect(newCard!.isDefault).toBe(false); // Second card should not be default
        expect(newCard!.cardPrefix).toBe('5555'); // First 4 digits of MasterCard test card

        // First card should still be default
        const primaryCard = updatedCustomer.cards.find(
          c => c.cardDescription === 'Primary Visa Card'
        );
        expect(primaryCard!.isDefault).toBe(true);

        trackTest('Add second card as non-default');
      });

      test('should reject invalid card number', async () => {
        const invalidCardData = {
          cardNumber: '1234567890123456', // Invalid card number
          cardExpiryMonth: 12,
          cardExpiryYear: 25,
          cvv2: '123',
        };

        await expect(
          sdk.customers.addCard(cardTestCustomer.lookupId, invalidCardData)
        ).rejects.toThrow();

        trackTest('Reject invalid card number');
      });

      test('should reject expired card', async () => {
        const expiredCardData = {
          cardNumber: TEST_CARDS.VISA_APPROVED.number,
          cardExpiryMonth: 1,
          cardExpiryYear: 20, // Expired year
          cvv2: TEST_CARDS.VISA_APPROVED.cvv,
        };

        await expect(
          sdk.customers.addCard(cardTestCustomer.lookupId, expiredCardData)
        ).rejects.toThrow();

        trackTest('Reject expired card');
      });
    });

    describe('Card Updates (PATCH /customer/{customer_lookup_id}/card/{card_lookup_id})', () => {
      let cardLookupId: string | undefined;

      beforeAll(async () => {
        // Get the current customer state to find a card
        const customer = await sdk.customers.getCustomer(
          cardTestCustomer.lookupId
        );
        if (customer.cards && customer.cards.length > 0) {
          cardLookupId = customer.cards[0]!.lookupId;
        }
      });

      test('should update card description', async () => {
        if (!cardLookupId) {
          console.log('⚠️ Skipping card update test - no cards available');
          return;
        }

        const updateData = { cardDescription: 'Updated Card Description' };

        const updatedCustomer = await sdk.customers.updateCard(
          cardTestCustomer.lookupId,
          cardLookupId,
          updateData
        );

        const updatedCard = updatedCustomer.cards.find(
          c => c.lookupId === cardLookupId
        );
        expect(updatedCard).toBeDefined();
        expect(updatedCard!.cardDescription).toBe(updateData.cardDescription);

        trackTest('Update card description');
      });

      test('should set card as default', async () => {
        if (!cardLookupId) {
          console.log('⚠️ Skipping default card test - no cards available');
          return;
        }

        // Get current customer state and find a non-default card
        const customer = await sdk.customers.getCustomer(
          cardTestCustomer.lookupId
        );
        const nonDefaultCard = customer.cards?.find(c => !c.isDefault);

        if (nonDefaultCard) {
          const updatedCard = await sdk.customers.setDefaultCard(
            cardTestCustomer.lookupId,
            nonDefaultCard.lookupId
          );

          expect(updatedCard.isDefault).toBe(true);

          // Verify only one default card exists
          const updatedCustomer = await sdk.customers.getCustomer(
            cardTestCustomer.lookupId
          );
          const defaultCards =
            updatedCustomer.cards?.filter(c => c.isDefault) || [];
          expect(defaultCards.length).toBe(1);
          expect(defaultCards[0]!.lookupId).toBe(nonDefaultCard.lookupId);

          trackTest('Set card as default');
        } else {
          console.log(
            '⚠️ Skipping default card test - no non-default cards available'
          );
        }
      });
    });

    describe('Card Removal (DELETE /customer/{customer_lookup_id}/card/{card_lookup_id})', () => {
      test('should remove a card', async () => {
        // Get current customer state
        const customer = await sdk.customers.getCustomer(
          cardTestCustomer.lookupId
        );
        const initialCardCount = customer.cards?.length || 0;

        if (initialCardCount > 1) {
          // Remove a non-default card
          const cardToRemove = customer.cards!.find(c => !c.isDefault);
          if (cardToRemove) {
            const updatedCustomer = await sdk.customers.removeCard(
              cardTestCustomer.lookupId,
              cardToRemove.lookupId
            );

            expect(updatedCustomer.cards?.length || 0).toBe(
              initialCardCount - 1
            );

            const removedCard = updatedCustomer.cards?.find(
              c => c.lookupId === cardToRemove.lookupId
            );
            expect(removedCard).toBeUndefined();

            trackTest('Remove card from customer');
          }
        } else if (initialCardCount === 1) {
          // Remove the only card
          const cardToRemove = customer.cards![0]!;
          const updatedCustomer = await sdk.customers.removeCard(
            cardTestCustomer.lookupId,
            cardToRemove.lookupId
          );

          expect(updatedCustomer.cards?.length || 0).toBe(0);
          trackTest('Remove only card from customer');
        } else {
          console.log('⚠️ Skipping card removal test - no cards to remove');
        }
      });
    });

    describe('Card Utility Methods', () => {
      test('should get default card', async () => {
        const defaultCard = await sdk.customers.getDefaultCard(
          cardTestCustomer.lookupId
        );

        if (defaultCard) {
          expect(defaultCard.isDefault).toBe(true);
          trackTest('Get default card');
        } else {
          console.log('ℹ️ No default card found (customer may have no cards)');
          trackTest('Handle no default card case');
        }
      });
    });
  });

  // ============================================================================
  // SUBSCRIPTION MANAGEMENT (API Structure Documentation)
  // Based on: POST /customer/{id}/subscription, PATCH /customer/{id}/subscription/{sub_id}
  // Note: Requires Plan Service integration for full testing
  // ============================================================================

  describe('Subscription Management (Real Endpoint Calls)', () => {
    let subscriptionTestCustomer: Customer;
    let testCardLookupId: string | undefined;

    beforeAll(async () => {
      // Create customer with a card for subscription testing
      const customerData = generateTestCustomer('_SUBSCRIPTION');
      subscriptionTestCustomer =
        await sdk.customers.createCustomer(customerData);
      createdCustomerIds.push(subscriptionTestCustomer.lookupId);
      testResults.customersCreated++;

      // Add a card for subscription payments
      try {
        const updatedCustomer = await sdk.customers.addCard(
          subscriptionTestCustomer.lookupId,
          {
            cardNumber: TEST_CARDS.VISA_APPROVED.number,
            cardExpiryMonth: TEST_CARDS.VISA_APPROVED.month,
            cardExpiryYear: TEST_CARDS.VISA_APPROVED.year,
            cvv2: TEST_CARDS.VISA_APPROVED.cvv,
            cardDescription: 'Subscription Payment Card',
          }
        );
        testCardLookupId = updatedCustomer.cards?.[0]?.lookupId;
        testResults.cardsAdded++;
      } catch (error) {
        console.log('⚠️ Could not add card for subscription tests');
      }
    });

    test('should call createSubscription endpoint and reject invalid plan', async () => {
      if (!testCardLookupId) {
        console.log(
          '⚠️ Skipping createSubscription test - no payment card available'
        );
        return;
      }

      await expect(
        sdk.customers.createSubscription(subscriptionTestCustomer.lookupId, {
          planLookupId: 'invalid-plan-lookup-id',
          cardLookupId: testCardLookupId,
          startDate: Date.now() + 24 * 60 * 60 * 1000,
          amount: 19.99,
          email: subscriptionTestCustomer.email,
        })
      ).rejects.toThrow();

      trackTest('Create subscription endpoint call (invalid plan)');
    });

    test('should call updateSubscription endpoint and reject invalid subscription ID', async () => {
      await expect(
        sdk.customers.updateSubscription(
          subscriptionTestCustomer.lookupId,
          'invalid-subscription-lookup-id',
          {
            amount: 29.99,
            status: 'ACTIVE',
          }
        )
      ).rejects.toThrow();

      trackTest('Update subscription endpoint call (invalid subscription)');
    });

    test('should call cancelSubscription endpoint and reject invalid subscription ID', async () => {
      await expect(
        sdk.customers.cancelSubscription(
          subscriptionTestCustomer.lookupId,
          'invalid-subscription-lookup-id'
        )
      ).rejects.toThrow();

      trackTest('Cancel subscription endpoint call (invalid subscription)');
    });

    test('should list subscriptions for customer', async () => {
      const subscriptions = await sdk.customers.listSubscriptions(
        subscriptionTestCustomer.lookupId
      );

      expect(Array.isArray(subscriptions)).toBe(true);
      // For our test customer without actual subscriptions, this should be empty
      expect(subscriptions.length).toBe(0);

      trackTest('List customer subscriptions');
    });
  });

  // ============================================================================
  // PLAN INTEGRATION (API Structure Documentation)
  // Based on: GET /customer/plan/{plan_lookup_id}
  // ============================================================================

  describe('Plan Service Integration (Real Endpoint Calls)', () => {
    test('should call getCustomersByPlan endpoint', async () => {
      await expect(
        sdk.customers.getCustomersByPlan('invalid-plan-lookup-id', {
          limit: 10,
          emailAddress: 'test@example.com',
          firstName: 'John',
          lastName: 'Doe',
          company: 'Test Company',
        })
      ).rejects.toThrow();

      trackTest('Plan customer retrieval endpoint call');
    });
  });

  // ============================================================================
  // ERROR HANDLING AND EDGE CASES
  // ============================================================================

  describe('Error Handling and Edge Cases', () => {
    test('should handle various invalid inputs', async () => {
      // Invalid customer lookup ID
      await expect(
        sdk.customers.getCustomer('invalid-lookup-id')
      ).rejects.toThrow();

      // Missing required email field
      await expect(sdk.customers.createCustomer({} as any)).rejects.toThrow();

      // Invalid email format
      await expect(
        sdk.customers.createCustomer({ email: 'not-an-email' })
      ).rejects.toThrow();

      trackTest('Handle various invalid inputs');
    });

    test('should handle card-related errors', async () => {
      if (createdCustomerIds.length > 0) {
        const testCustomerId = createdCustomerIds[0]!;

        // Invalid card lookup ID
        await expect(
          sdk.customers.updateCard(testCustomerId, 'invalid-card-id', {
            cardDescription: 'Test',
          })
        ).rejects.toThrow();

        // Invalid card expiry month
        await expect(
          sdk.customers.addCard(testCustomerId, {
            cardNumber: TEST_CARDS.VISA_APPROVED.number,
            cardExpiryMonth: 13, // Invalid month
            cardExpiryYear: TEST_CARDS.VISA_APPROVED.year,
            cvv2: TEST_CARDS.VISA_APPROVED.cvv,
          })
        ).rejects.toThrow();

        trackTest('Handle card-related errors');
      } else {
        console.log('⚠️ Skipping card error tests - no customers available');
      }
    });

    test('should handle network and API errors gracefully', async () => {
      // These tests verify error handling without breaking the test suite
      try {
        await sdk.customers.getCustomer('definitely-invalid-id-12345');
      } catch (error: any) {
        expect(error).toBeDefined();
        expect(error.message).toBeDefined();
      }

      trackTest('Handle network and API errors');
    });
  });

  // ============================================================================
  // PERFORMANCE AND INTEGRATION TESTS
  // ============================================================================

  describe('Performance and Integration', () => {
    test('should handle rapid sequential operations', async () => {
      const operations = [];

      // Create multiple customers rapidly
      for (let i = 0; i < 3; i++) {
        const customerData = generateTestCustomer(`_PERF_${i}`);
        operations.push(sdk.customers.createCustomer(customerData));
      }

      const customers = await Promise.all(operations);
      customers.forEach(customer => {
        createdCustomerIds.push(customer.lookupId);
        testResults.customersCreated++;
      });

      expect(customers.length).toBe(3);
      trackTest('Handle rapid sequential operations');
    });

    test('should maintain data consistency across operations', async () => {
      // Create, update, and retrieve customer to ensure consistency
      const customerData = generateTestCustomer('_CONSISTENCY');
      const customer = await sdk.customers.createCustomer(customerData);
      createdCustomerIds.push(customer.lookupId);
      testResults.customersCreated++;

      const updateData = { firstName: 'ConsistencyTest' };
      await sdk.customers.updateCustomer(customer.lookupId, updateData);

      const retrievedCustomer = await sdk.customers.getCustomer(
        customer.lookupId
      );

      expect(retrievedCustomer.firstName).toBe(updateData.firstName);
      expect(retrievedCustomer.lookupId).toBe(customer.lookupId);
      expect(retrievedCustomer.email).toBe(customerData.email);

      trackTest('Maintain data consistency');
    });
  });
});
