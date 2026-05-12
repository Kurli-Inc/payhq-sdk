# Transaction Service Tests

This directory contains comprehensive tests for the PayHQ SDK's TransactionService using sandbox credentials.

## Prerequisites

Before running the tests, you need:

1. **PayFirma Sandbox Account**: Sign up for a PayFirma developer account
2. **Sandbox Credentials**: Obtain your sandbox client ID and client secret
3. **Node.js**: Ensure you're using the correct Node version (see `.nvmrc`)

## Setup

### 1. Provide sandbox credentials via environment variables

Integration tests read credentials from the environment — they are **never**
committed to source. Set the following before running integration tests:

```bash
export PAYHQ_CLIENT_ID="your_sandbox_client_id"
export PAYHQ_CLIENT_SECRET="your_sandbox_client_secret"
```

A `.env.example` is included at the repo root showing the variables.

If the variables are not set, integration test suites are expected to skip
(see `hasIntegrationCredentials` in `tests/setup.ts`). Unit tests do not need
credentials.

### 2. Environment Setup

Make sure you're using the correct Node version:

```bash
nvm use
```

### 3. Install Dependencies

```bash
npm install
```

## Running Tests

### Run All Tests

```bash
npm test
```

### Run Tests with Coverage

```bash
npm run test:coverage
```

### Run Tests in Watch Mode

```bash
npm run test:watch
```

### Run Specific Test Suite

```bash
npm test -- --testNamePattern="Sale Transactions"
```

## Test Structure

The tests are organized into the following categories:

### 🏪 **Payment Processing**

- **Sale Transactions**: Complete payment processing
- **Authorization Transactions**: Auth-only transactions
- **Capture Transactions**: Capturing authorized amounts
- **Refund Transactions**: Full and partial refunds

### 🔍 **Transaction Retrieval**

- Get transaction by ID
- Check transaction existence
- List account transactions with filtering (`/transaction`)
- List authenticated user transactions with filtering (`/transaction/user`)

### 📊 **Search and Filter Methods**

- Filter by status (approved, declined, pending)
- Filter by date range
- Filter by amount range

### 📈 **Reporting and Analytics**

- Transaction summaries
- Daily volume reports

### ⚠️ **Error Handling**

- Invalid transaction IDs
- Invalid card details
- Invalid amounts

## Test Cards

The tests use standard sandbox test card numbers:

```typescript
// These cards will be approved in sandbox
VISA_APPROVED: '4111111111111111';
MASTERCARD_APPROVED: '5555555555554444';
AMEX_APPROVED: '378282246310005';

// This card will be declined
VISA_DECLINED: '4000000000000002';
```

## Test Configuration

### Timeouts

- Default test timeout: 30 seconds (suitable for API calls)
- Rate limiting: 1-second delay between tests

### Test Amounts

- Small: $10.00
- Medium: $100.00
- Large: $1000.00
- Declined: $5.00 (typically gets declined in sandbox)

## Important Notes

### 🔒 **Security**

- Never commit any credentials, sandbox or production. Even sandbox keys are
  scoped to your account and can be abused if leaked publicly.
- Use environment variables (see Setup) and rotate your sandbox keys if you
  suspect they were exposed.
- Test transactions won't process real money.

### 🌐 **API Environment**

- Tests run against PayFirma sandbox environment
- Sandbox may have different behavior than production
- Rate limiting may apply even in sandbox

### 🧹 **Cleanup**

- Tests track created transaction IDs for potential cleanup
- Sandbox transactions typically auto-expire
- Some test transactions may remain in sandbox dashboard

## Troubleshooting

### "Authentication failed"

- Check that your sandbox credentials are correct
- Verify the credentials are active in PayFirma dashboard
- Ensure you're using sandbox (not production) credentials

### "Network timeout"

- PayFirma sandbox may be temporarily unavailable
- Check your internet connection
- Increase timeout values if needed

### "Rate limited"

- Add delays between test runs
- Reduce concurrent test execution
- Contact PayFirma support if limits are too restrictive

### "Transaction declined"

- Expected behavior for test cards designed to decline
- Check that you're using the correct test card numbers
- Verify amounts are within acceptable ranges

## Example Test Run

```bash
npm run test:integration
```

Integration suites include `tests/TransactionService.comprehensive.test.ts`,
`tests/CustomerService.comprehensive.test.ts`, and `tests/TerminalService.test.ts`.
Without sandbox credentials, those suites are skipped.

## Contributing

When adding new tests:

1. Follow the existing test structure
2. Use appropriate test timeouts for API calls
3. Include both success and error scenarios
4. Add delays to avoid rate limiting
5. Update this README if adding new test categories
