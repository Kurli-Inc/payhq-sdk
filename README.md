# PayHQ SDK for TypeScript/JavaScript

**Version 0.1.0** — first published release. This is a **small, thin TypeScript
wrapper** around the PayHQ (Payfirma) HTTP APIs: OAuth, customers, transactions,
and card terminals. It focuses on typed requests/responses and auth—not a
full-featured platform SDK.

Per [SemVer](https://semver.org/), **0.x** releases may introduce breaking
changes; pin to a patch range (e.g. `^0.1.0`) or an exact version in production
until a stable **1.0.0**.

**By [Kurli](https://github.com/Kurli-Inc). Not affiliated with PayHQ / Payfirma.**

> **Scope:** The package wraps the three documented Payfirma developer APIs
> we exercise in tests: **Customer**, **Transaction**, and **Card Terminal**
> (plus OAuth 2.0). Other Payfirma endpoints (Plans, Invoices, EFT, etc.) are
> **not included** — call those REST endpoints directly if you need them. See
> [API coverage](#api-coverage) below.

## Features

- OAuth 2.0 (client credentials + authorization code)
- Payments: sales, auth/capture, refunds, stored-card charges via Transaction API
- Customers: CRUD, cards, subscriptions
- Card terminal (sale, refund, authorize, capture)
- camelCase API; request/response transformed to/from snake_case
- Sandbox and production

## Installation

```bash
npm install @kurli-inc/payhq-sdk@^0.1.0
```

Install without a range to get the latest tag; for reproducible builds under
0.x, prefer pinning `0.1.x` or an exact version.

The published package exposes **CommonJS** and **ESM** entry points (`package.json`
`exports`: `require` → `dist/index.js`, `import` → `dist/index.mjs`). TypeScript
consumers get typings from `dist/index.d.ts`.

## Quick Start

```typescript
import { PayHQSDK } from '@kurli-inc/payhq-sdk';

const sdk = new PayHQSDK({
  clientId: 'your-client-id',
  clientSecret: 'your-client-secret',
  sandbox: true,
});

await sdk.initialize();

const transaction = await sdk.transactions.quickSale(
  10.99,
  '4111111111111111',
  12, // expiry month
  25, // expiry year
  '123',
  'CAD'
);

console.log('Transaction successful:', transaction.id);
```

## Configuration

```typescript
const sdk = new PayHQSDK({
  clientId: 'your-client-id',
  clientSecret: 'your-client-secret',
  sandbox: true, // default: false
  timeout: 30000, // optional, ms — default for auth/customer/transaction
  terminalTimeout: 90000, // optional, ms — card-terminal (longer; customer interaction)
  debug: false, // optional — redacted request/response logging (never logs PAN/CVV/secrets)
  apiUrls: {
    // optional overrides
    auth: 'https://...',
    gateway: 'https://...',
  },
});

// Or use helpers
const sandbox = PayHQSDK.createSandbox('client-id', 'client-secret');
const prod = PayHQSDK.createProduction('client-id', 'client-secret');
```

For card-terminal requests, a longer HTTP client timeout is common because customer interaction (tap, insert, PIN, terminal confirmation) can exceed typical API latency. If you omit both `timeout` and `terminalTimeout`, non-terminal calls still default to **30s** while the terminal client defaults to **90s** (`PAYHQ_DEFAULT_TERMINAL_TIMEOUT_MS`, exported from the package). Override with `terminalTimeout` for terminal-only, or set `timeout` to apply the same value to all services when `terminalTimeout` is not set.

## Authentication

- **Client credentials (typical):** `await sdk.initialize()` before calling APIs.
- **OAuth code flow:** `sdk.getAuthorizationUrl(redirectUri, state?, scopes?)` then `await sdk.exchangeCodeForToken(code, redirectUri, state?)`.
- **Pre-obtained token:** `sdk.setCredentials(accessToken, expiresAt?)` or `await sdk.setCredentialsWithValidation(accessToken, expiresAt?)` (refreshes if expiry is within 5 minutes).
- **Refresh / revoke:** `await sdk.refreshToken()` · `await sdk.revoke()`.
- **Status:** `sdk.getAuthStatus()` → `{ isAuthenticated, tokenValid, expiresAt? }`.

## API Overview

Use **camelCase** in your code (e.g. `firstName`, `postalCode`). The SDK converts to/from the API’s snake_case.

### Transactions

- `sdk.transactions.quickSale(amount, cardNumber, month, year, cvv, currency?)`
- `sdk.transactions.saleWithToken(amount, token, currency?)`
- `sdk.transactions.createSale(request)` — full request with card or token
- `sdk.transactions.quickAuthorization(...)` / `captureFullAmount(id)` / `capturePartialAmount(id, amount)`
- `sdk.transactions.fullRefund(transactionId)` / `partialRefund(id, amount, reason?)`
- `sdk.transactions.getTransaction(id)` / `listTransactions(params?)` / `listUserTransactions(params?)` / `getTransactionSummary(params?)`
- `listTransactions(params?)` lists account transactions; `listUserTransactions(params?)` maps to `/transaction/user` for the authenticated user's transactions.

### Customers

- `sdk.customers.createCustomer({ email, firstName?, lastName?, ... })`
- `sdk.customers.getCustomer(lookupId)` / `updateCustomer(lookupId, partial)` / `listCustomers(params?)`
- `sdk.customers.addCard(lookupId, cardRequest)` / `updateCard(...)` / `removeCard(...)`
- Stored-card charges: `sdk.transactions.createSale({ amount, currency, customerLookupId?, cardLookupId?, ... })`
- `sdk.customers.createSubscription(lookupId, request)` / `updateSubscription(...)` / `cancelSubscription(...)` / `listSubscriptions(lookupId)`
- `sdk.customers.getDefaultCard(lookupId)` / `setDefaultCard(lookupId, cardLookupId)`
- `sdk.customers.searchCustomersByEmail(email)` / `searchCustomersByName(first?, last?)`

### Terminals (card-present)

- `sdk.terminals.sale(request)` — `{ amount, currency, processorId, ... }`
- `sdk.terminals.saleWithCustomer(request)` — `{ customerLookupId, amount, currency, processorId, ... }`
- `sdk.terminals.refund(request)` — `{ originalTransactionId, amount, currency, processorId, ... }`
- `sdk.terminals.authorize(request)` / `sdk.terminals.capture(transactionId, request)`

Note: Sandbox verification confirms Card Terminal capture is `POST /capture/{transactionId}` with body fields (for example `amount`, `currency`, `processor_id`, and optional `invoice_id`). Payfirma docs currently showing `GET` appear to be a typo.

## API coverage

| Payfirma API             | Reference                                                                                    | Status                                       |
| ------------------------ | -------------------------------------------------------------------------------------------- | -------------------------------------------- |
| Customer                 | [developer.payfirma.com/api/customer](https://developer.payfirma.com/api/customer)           | **Supported** — `sdk.customers`              |
| Transaction              | [developer.payfirma.com/api/transaction](https://developer.payfirma.com/api/transaction)     | **Supported** — `sdk.transactions`           |
| Card Terminal            | [developer.payfirma.com/api/card-terminal](https://developer.payfirma.com/api/card-terminal) | **Supported** — `sdk.terminals`              |
| OAuth                    | (covered)                                                                                    | **Supported** — `sdk.auth`                   |
| Plan / recurring billing | [developer.payfirma.com](https://developer.payfirma.com)                                     | **Not in this version** — call REST directly |
| Invoice                  | [developer.payfirma.com](https://developer.payfirma.com)                                     | **Not in this version** — call REST directly |
| EFT                      | [developer.payfirma.com](https://developer.payfirma.com)                                     | **Not in this version** — call REST directly |
| Other endpoints          | [developer.payfirma.com](https://developer.payfirma.com)                                     | **Not in this version** — call REST directly |

If you need an API that is not in this version, you can still issue authenticated REST requests by retrieving the bearer token from `AuthService.getCredentials()`, which returns an `AuthCredentials` object; for example: `sdk.auth.getCredentials()?.access_token`.

## Error Handling

```typescript
import {
  AuthenticationError,
  PaymentError,
  ValidationError,
  NetworkError,
  RateLimitError,
  TimeoutError,
} from '@kurli-inc/payhq-sdk';

try {
  await sdk.transactions.quickSale(/* ... */);
} catch (err) {
  if (err instanceof AuthenticationError) {
    /* ... */
  }
  if (err instanceof PaymentError) {
    /* err.code, err.details */
  }
  if (err instanceof ValidationError) {
    /* ... */
  }
  if (err instanceof NetworkError) {
    /* ... */
  }
  if (err instanceof RateLimitError) {
    /* HTTP 429 — SDK does not retry; implement backoff in your app */
  }
  if (err instanceof TimeoutError) {
    /* SDK HTTP timeout or fetch abort — increase timeout if needed */
  }
}
```

Other exported error types include `ApiError`, `NotFoundError`, `ConfigurationError`, and base `PayHQError`. On HTTP 429 the SDK throws `RateLimitError`; it does not retry.

## TypeScript

The package is written in TypeScript and ships type definitions. Use camelCase in your code; types align with the SDK’s transformed API.

## Requirements

- Node.js >= 18 (the SDK uses the global `fetch` API).

## Development

```bash
git clone https://github.com/Kurli-Inc/payhq-sdk.git
cd payhq-sdk
nvm use           # honours .nvmrc
npm install
npm run build
npm run typecheck
npm test                    # unit tests (no credentials)
npm run test:integration    # integration tests (requires sandbox credentials; see .env.example)
npm run lint
npm run lint:fix
```

## Contributing

See [CONTRIBUTING.md](https://github.com/Kurli-Inc/payhq-sdk/blob/main/CONTRIBUTING.md). Changes are tracked in
[CHANGELOG.md](CHANGELOG.md).

## License

MIT — see [LICENSE](LICENSE).

## Support

- **SDK / repo:** [GitHub Issues](https://github.com/Kurli-Inc/payhq-sdk/issues)
- **PayHQ / Payfirma API:** [developer.payfirma.com](https://developer.payfirma.com) · support@payfirma.com

---

You need valid PayHQ (Payfirma) API credentials. For sandbox card numbers and behaviour, see [Payfirma’s documentation](https://developer.payfirma.com).
