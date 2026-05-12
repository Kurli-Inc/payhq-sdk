/**
 * Public API surface tests.
 *
 * The public package only ships the three documented Payfirma API areas plus OAuth:
 *   - Customer (https://developer.payfirma.com/api/customer)
 *   - Transaction (https://developer.payfirma.com/api/transaction)
 *   - Card Terminal (https://developer.payfirma.com/api/card-terminal)
 *
 * Plans, Invoices, and EFT must NOT be on the public surface.
 */

import * as publicApi from '../../src';
import { PayHQSDK } from '../../src';
import type { TerminalTransaction, TerminalTransactionType } from '../../src';

describe('public API surface', () => {
  it('accepts AUTHORIZE as a terminal transaction type', () => {
    const value: TerminalTransactionType = 'AUTHORIZE';
    expect(value).toBe('AUTHORIZE');
  });

  it('types terminal transactionType as TerminalTransactionType', () => {
    const transaction: TerminalTransaction = {
      id: 1,
      transactionId: 'tx-id',
      transactionSuccess: true,
      transactionResult: 'APPROVED',
      transactionTime: Date.now(),
      transactionType: 'CAPTURE',
      amount: 1,
    };

    const transactionType: TerminalTransactionType =
      transaction.transactionType;
    expect(transactionType).toBe('CAPTURE');
  });

  describe('top-level exports', () => {
    it('exports the SDK class and the four supported services', () => {
      expect(publicApi.PayHQSDK).toBeDefined();
      expect(publicApi.AuthService).toBeDefined();
      expect(publicApi.CustomerService).toBeDefined();
      expect(publicApi.TransactionService).toBeDefined();
      expect(publicApi.TerminalService).toBeDefined();
    });

    it('does NOT export unsupported services (Plan, Invoice, EFT)', () => {
      expect((publicApi as any).PlanService).toBeUndefined();
      expect((publicApi as any).InvoiceService).toBeUndefined();
      expect((publicApi as any).EFTService).toBeUndefined();
    });

    it('exports canonical enum values for customer, transaction, and terminal types', () => {
      expect(publicApi.SubscriptionStatusEnum.CANCELED).toBe('CANCELED');
      expect(publicApi.SubscriptionFrequencyEnum.MONTHLY).toBe('MONTHLY');
      expect(publicApi.TransactionTypeEnum.SALE).toBe('SALE');
      expect(publicApi.TransactionStatusEnum.APPROVED).toBe('APPROVED');
      expect(publicApi.TransactionListFilterStatusEnum.DECLINED).toBe(
        'DECLINED'
      );
      expect(publicApi.TransactionListChannelEnum.CARD_TERMINAL).toBe(
        'CARD_TERMINAL'
      );
      expect(publicApi.TransactionSourceEnum.CARD_TERMINAL).toBe(
        'CARD_TERMINAL'
      );
      expect(publicApi.TerminalTransactionTypeEnum.AUTHORIZE).toBe('AUTHORIZE');
      expect(publicApi.TerminalTransactionStatusEnum.DECLINED).toBe('DECLINED');
      expect(publicApi.TerminalStatusEnum.ACTIVE).toBe('ACTIVE');
    });
  });

  describe('PayHQSDK instance', () => {
    const sdk = new PayHQSDK({
      clientId: 'id',
      clientSecret: 'secret',
      sandbox: true,
    });

    it('exposes the four supported service properties', () => {
      expect(sdk.auth).toBeDefined();
      expect(sdk.customers).toBeDefined();
      expect(sdk.transactions).toBeDefined();
      expect(sdk.terminals).toBeDefined();
    });

    it('does NOT expose plans, invoices, or eft', () => {
      expect((sdk as any).plans).toBeUndefined();
      expect((sdk as any).invoices).toBeUndefined();
      expect((sdk as any).eft).toBeUndefined();
    });

    it('does NOT expose undocumented Customer charge endpoints', () => {
      expect(
        'chargeDefaultCard' in sdk.customers &&
          typeof (sdk.customers as any).chargeDefaultCard === 'function'
      ).toBe(false);
      expect(
        'chargeCard' in sdk.customers &&
          typeof (sdk.customers as any).chargeCard === 'function'
      ).toBe(false);
    });

    it('does NOT expose undocumented Customer subscription retrieval endpoint', () => {
      expect(
        'getSubscription' in sdk.customers &&
          typeof (sdk.customers as any).getSubscription === 'function'
      ).toBe(false);
    });
  });
});
