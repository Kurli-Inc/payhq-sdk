import { stripBearerToken } from '../../src/utils/stripBearerToken';

describe('stripBearerToken', () => {
  it('removes leading Bearer prefix (HTTP auth style)', () => {
    expect(stripBearerToken('Bearer abc.def.ghi')).toBe('abc.def.ghi');
  });

  it('removes bearer prefix case-insensitively', () => {
    expect(stripBearerToken('bearer token-value')).toBe('token-value');
  });

  it('trims whitespace around the value', () => {
    expect(stripBearerToken('  Bearer  spaced  ')).toBe('spaced');
  });

  it('returns trimmed string when no Bearer prefix', () => {
    expect(stripBearerToken(' raw-jwt ')).toBe('raw-jwt');
  });
});
