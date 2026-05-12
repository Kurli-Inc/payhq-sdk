/**
 * Unit tests for camelCase/snake_case transformers
 */

import {
  camelToSnake,
  snakeToCamel,
  transformKeysToSnake,
  transformKeysToCamel,
} from '../../src/utils/transformers';

describe('transformers', () => {
  describe('camelToSnake', () => {
    it('converts camelCase to snake_case', () => {
      expect(camelToSnake('firstName')).toBe('first_name');
      expect(camelToSnake('lookupId')).toBe('lookup_id');
    });
    it('handles single word', () => {
      expect(camelToSnake('email')).toBe('email');
    });
    it('handles multiple capitals', () => {
      expect(camelToSnake('someDTO')).toBe('some_d_t_o');
    });
  });

  describe('snakeToCamel', () => {
    it('converts snake_case to camelCase', () => {
      expect(snakeToCamel('first_name')).toBe('firstName');
      expect(snakeToCamel('lookup_id')).toBe('lookupId');
    });
    it('handles single word', () => {
      expect(snakeToCamel('email')).toBe('email');
    });
  });

  describe('transformKeysToSnake', () => {
    it('transforms flat object keys to snake_case', () => {
      expect(
        transformKeysToSnake({ firstName: 'John', lastName: 'Doe' })
      ).toEqual({ first_name: 'John', last_name: 'Doe' });
    });
    it('transforms nested object keys', () => {
      expect(
        transformKeysToSnake({ billingAddress: { postalCode: '12345' } })
      ).toEqual({ billing_address: { postal_code: '12345' } });
    });
    it('transforms array elements', () => {
      expect(transformKeysToSnake([{ itemName: 'x' }])).toEqual([
        { item_name: 'x' },
      ]);
    });
    it('returns null/unchanged for primitives', () => {
      expect(transformKeysToSnake(null)).toBe(null);
      expect(transformKeysToSnake(42)).toBe(42);
      expect(transformKeysToSnake('str')).toBe('str');
    });
  });

  describe('transformKeysToCamel', () => {
    it('transforms flat object keys to camelCase', () => {
      expect(
        transformKeysToCamel({ first_name: 'John', last_name: 'Doe' })
      ).toEqual({ firstName: 'John', lastName: 'Doe' });
    });
    it('transforms nested object keys', () => {
      expect(
        transformKeysToCamel({ billing_address: { postal_code: '12345' } })
      ).toEqual({ billingAddress: { postalCode: '12345' } });
    });
    it('transforms array elements', () => {
      expect(transformKeysToCamel([{ item_name: 'x' }])).toEqual([
        { itemName: 'x' },
      ]);
    });
    it('returns null/unchanged for primitives', () => {
      expect(transformKeysToCamel(null)).toBe(null);
      expect(transformKeysToCamel(42)).toBe(42);
    });
  });
});
