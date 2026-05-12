/**
 * Unit tests for ErrorFactory and error types
 */

import {
  ErrorFactory,
  AuthenticationError,
  ValidationError,
  PaymentError,
  NotFoundError,
  RateLimitError,
  ApiError,
  NetworkError,
  TimeoutError,
  PayHQErrorCode,
} from '../../src/types/errors';

describe('ErrorFactory', () => {
  describe('fromApiResponse', () => {
    it('returns AuthenticationError for auth-related codes', () => {
      const err = ErrorFactory.fromApiResponse({
        code: 'AUTHENTICATION_FAILED',
        message: 'Invalid credentials',
        status: 401,
      });
      expect(err).toBeInstanceOf(AuthenticationError);
      expect(err.message).toBe('Invalid credentials');
      expect(err.statusCode).toBe(401);
    });

    it('returns ValidationError for validation codes', () => {
      const err = ErrorFactory.fromApiResponse({
        code: 'VALIDATION_ERROR',
        message: 'Invalid format',
        status: 400,
      });
      expect(err).toBeInstanceOf(ValidationError);
      expect(err.message).toBe('Invalid format');
    });

    it('returns PaymentError for payment-related codes', () => {
      const err = ErrorFactory.fromApiResponse({
        code: 'PAYMENT_DECLINED',
        message: 'Card declined',
        status: 402,
      });
      expect(err).toBeInstanceOf(PaymentError);
      expect(err.message).toBe('Card declined');
    });

    it('returns RateLimitError for RATE_LIMIT_EXCEEDED', () => {
      const err = ErrorFactory.fromApiResponse({
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests',
        status: 429,
      });
      expect(err).toBeInstanceOf(RateLimitError);
      expect(err.statusCode).toBe(429);
    });

    it('returns RateLimitError for HTTP 429 without a rate-limit body code', () => {
      const err = ErrorFactory.fromApiResponse({
        code: 'API_ERROR',
        message: 'Too many requests',
        status: 429,
      });
      expect(err).toBeInstanceOf(RateLimitError);
      expect(err.statusCode).toBe(429);
    });

    it('returns NotFoundError for *_NOT_FOUND codes', () => {
      const err = ErrorFactory.fromApiResponse({
        code: 'CUSTOMER_NOT_FOUND',
        message: 'Customer not found',
        status: 404,
      });
      expect(err).toBeInstanceOf(NotFoundError);
      expect(err.message).toBe('Customer not found');
    });

    it('returns ApiError for unknown code', () => {
      const err = ErrorFactory.fromApiResponse({
        code: 'UNKNOWN_CODE',
        message: 'Something went wrong',
        status: 500,
      });
      expect(err).toBeInstanceOf(ApiError);
      expect(err.message).toBe('Something went wrong');
      expect(err.statusCode).toBe(500);
    });
  });

  describe('networkError', () => {
    it('returns NetworkError with message and optional cause', () => {
      const cause = new Error('fetch failed');
      const err = ErrorFactory.networkError('Network error', cause);
      expect(err).toBeInstanceOf(NetworkError);
      expect(err.message).toBe('Network error');
      expect(err.cause).toBe(cause);
    });
  });

  describe('fromFetchTransportError', () => {
    it('passes through existing TimeoutError instances', () => {
      const inner = new TimeoutError('Request timeout after 5000ms');
      const err = ErrorFactory.fromFetchTransportError(inner);
      expect(err).toBe(inner);
      expect(err?.message).toBe('Request timeout after 5000ms');
      expect(err?.code).toBe(PayHQErrorCode.TIMEOUT_ERROR);
      expect(err?.statusCode).toBe(408);
    });

    it('maps AbortError to TimeoutError with guidance when message is generic', () => {
      const inner = new DOMException(
        'This operation was aborted',
        'AbortError'
      );
      const err = ErrorFactory.fromFetchTransportError(inner);
      expect(err).toBeInstanceOf(TimeoutError);
      expect(err?.code).toBe(PayHQErrorCode.TIMEOUT_ERROR);
      expect(err?.message).toContain('SDK HTTP timeout');
      expect(err?.cause).toBe(inner);
    });

    it('returns null for unrelated errors', () => {
      expect(
        ErrorFactory.fromFetchTransportError(new Error('nope'))
      ).toBeNull();
    });
  });
});
