/**
 * PayHQ SDK for TypeScript/JavaScript (0.x — thin wrapper; see README)
 *
 * Wraps the PayHQ (Payfirma) payment APIs: OAuth 2.0 authentication,
 * customer management, transaction processing, and card terminal.
 *
 * @example
 * ```typescript
 * import { PayHQSDK } from 'payhq-sdk';
 *
 * const sdk = new PayHQSDK({
 *   clientId: 'your-client-id',
 *   clientSecret: 'your-client-secret',
 *   sandbox: true
 * });
 * ```
 */

export * from './PayHQSDK';
export * from './types';
export * from './errors';
export * from './services';
export * from './utils/transformers';
