import { PayHQSDKConfig, Environment } from '../types/common';
import { isAbortError } from './isAbortError';
import { TimeoutError } from '../types/errors';
import { transformKeysToSnake, transformKeysToCamel } from './transformers';
import { SDK_VERSION } from '../version';
import { redactForDebugLogJson } from './redactForDebugLog';

const SAFE_RESPONSE_HEADER_NAMES = new Set([
  'retry-after',
  'x-request-id',
  'x-correlation-id',
  'traceparent',
  'x-trace-id',
  'x-amzn-requestid',
]);

const NORMALIZED_SENSITIVE_RESPONSE_KEYS = new Set([
  'pan',
  'cvv',
  'cvv2',
  'token',
  'cardnumber',
]);

function safeRequestPath(fullUrl: string): string {
  try {
    return new URL(fullUrl).pathname;
  } catch {
    try {
      return new URL(fullUrl, 'http://local.invalid').pathname;
    } catch {
      return fullUrl.split('?')[0] ?? fullUrl;
    }
  }
}

function redactSensitiveResponseData(value: any): any {
  if (Array.isArray(value)) {
    return value.map(item => redactSensitiveResponseData(item));
  }

  if (!value || typeof value !== 'object') {
    return value;
  }

  return Object.entries(value).reduce(
    (sanitized: Record<string, any>, [key, nestedValue]) => {
      const normalizedKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
      sanitized[key] = NORMALIZED_SENSITIVE_RESPONSE_KEYS.has(normalizedKey)
        ? '[REDACTED]'
        : redactSensitiveResponseData(nestedValue);
      return sanitized;
    },
    {}
  );
}

function getSafeResponseHeaders(headers: Headers): Record<string, string> {
  const safeHeaders: Record<string, string> = {};

  headers.forEach((value, name) => {
    const normalizedName = name.toLowerCase();

    if (SAFE_RESPONSE_HEADER_NAMES.has(normalizedName)) {
      safeHeaders[normalizedName] = value;
    }
  });

  return safeHeaders;
}

/**
 * HTTP client configuration
 */
export interface HttpClientConfig {
  baseURL: string;
  timeout: number;
  headers: Record<string, string>;
  transformRequest?: boolean;
  transformResponse?: boolean;
  debug?: boolean;
}

/**
 * HTTP client class that wraps fetch with axios-like interface
 */
export class HttpClient {
  private config: HttpClientConfig;

  /**
   * Create a reusable HTTP client wrapper around `fetch`.
   */
  constructor(config: HttpClientConfig) {
    this.config = config;
  }

  /**
   * Make an HTTP request
   */
  async request<T = any>(options: {
    method: string;
    url: string;
    data?: any;
    headers?: Record<string, string>;
    params?: Record<string, any>;
  }): Promise<{ data: T; status: number; statusText: string }> {
    const { method, url, data, headers = {}, params } = options;

    // Build full URL
    let fullUrl = this.config.baseURL + url;

    // Add query parameters
    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, String(value));
        }
      });
      const queryString = searchParams.toString();
      if (queryString) {
        fullUrl += (fullUrl.includes('?') ? '&' : '?') + queryString;
      }
    }

    // Prepare request body
    let body: string | FormData | undefined;
    const requestHeaders = { ...this.config.headers, ...headers };

    if (data) {
      if (
        requestHeaders['Content-Type'] === 'application/x-www-form-urlencoded'
      ) {
        // For form data (auth endpoints)
        const formData = new URLSearchParams();
        Object.entries(data).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            formData.append(key, String(value));
          }
        });
        body = formData.toString();
      } else {
        // For JSON data - apply transformers if enabled
        const transformedData = this.config.transformRequest
          ? transformKeysToSnake(data)
          : data;

        // Debug logging for request transformation
        if (this.config.debug && this.config.transformRequest) {
          console.log(
            'HTTP Client - Original data:',
            redactForDebugLogJson(data)
          );
          console.log(
            'HTTP Client - Transformed to snake_case:',
            redactForDebugLogJson(transformedData)
          );
        }

        body = JSON.stringify(transformedData);
      }
    }

    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(fullUrl, {
        method,
        headers: requestHeaders,
        body,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Parse response
      let responseData: any;
      const contentType = response.headers.get('content-type');

      if (contentType && contentType.includes('application/json')) {
        responseData = await response.json();

        // Debug logging for response transformation
        if (this.config.debug && this.config.transformResponse) {
          console.log(
            'HTTP Client - Raw response (snake_case):',
            redactForDebugLogJson(responseData)
          );
        }

        // Apply response transformers if enabled
        if (this.config.transformResponse) {
          responseData = transformKeysToCamel(responseData);

          if (this.config.debug) {
            console.log(
              'HTTP Client - Transformed to camelCase:',
              redactForDebugLogJson(responseData)
            );
          }
        }
      } else {
        responseData = await response.text();
      }

      if (!response.ok) {
        const redactedResponseData = redactSensitiveResponseData(responseData);
        const error = new Error(
          `HTTP ${response.status}: ${response.statusText}`
        ) as any;
        error.response = {
          status: response.status,
          statusText: response.statusText,
          data: redactedResponseData,
          headers: getSafeResponseHeaders(response.headers),
        };
        Object.defineProperty(error, '_rawResponse', {
          value: responseData,
          enumerable: false,
          writable: false,
        });
        // NOTE: request body intentionally omitted - payment payloads include
        // PAN/CVV/tokens that must not leak through caller error logs.
        error.request = { url: safeRequestPath(fullUrl), method };
        throw error;
      }

      return {
        data: responseData,
        status: response.status,
        statusText: response.statusText,
      };
    } catch (error) {
      clearTimeout(timeoutId);

      if (isAbortError(error)) {
        throw new TimeoutError(
          `Request timeout after ${this.config.timeout}ms`,
          error instanceof Error ? error : undefined
        );
      }

      throw error;
    }
  }

  /**
   * GET request
   */
  async get<T = any>(
    url: string,
    config?: { params?: Record<string, any>; headers?: Record<string, string> }
  ) {
    return this.request<T>({ method: 'GET', url, ...config });
  }

  /**
   * POST request
   */
  async post<T = any>(
    url: string,
    data?: any,
    config?: { headers?: Record<string, string> }
  ) {
    return this.request<T>({ method: 'POST', url, data, ...config });
  }

  /**
   * PUT request
   */
  async put<T = any>(
    url: string,
    data?: any,
    config?: { headers?: Record<string, string> }
  ) {
    return this.request<T>({ method: 'PUT', url, data, ...config });
  }

  /**
   * PATCH request
   */
  async patch<T = any>(
    url: string,
    data?: any,
    config?: { headers?: Record<string, string> }
  ) {
    return this.request<T>({ method: 'PATCH', url, data, ...config });
  }

  /**
   * DELETE request
   */
  async delete<T = any>(
    url: string,
    config?: { headers?: Record<string, string> }
  ) {
    return this.request<T>({ method: 'DELETE', url, ...config });
  }
}

/**
 * Create a configured HTTP client with camelCase transformers
 */
export function createApiClient(
  config: PayHQSDKConfig,
  environment: Environment,
  baseURL?: string
): HttpClient {
  return new HttpClient({
    baseURL: baseURL || environment.gatewayUrl,
    timeout: config.timeout || 30000,
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': `PayHQ-SDK-TypeScript/${SDK_VERSION}`,
    },
    transformRequest: true,
    transformResponse: true,
    debug: config.debug || false,
  });
}

/**
 * Create a configured HTTP client for auth endpoints (no JSON transformers)
 */
export function createAuthClient(
  config: PayHQSDKConfig,
  environment: Environment
): HttpClient {
  return new HttpClient({
    baseURL: environment.authUrl,
    timeout: config.timeout || 30000,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': `PayHQ-SDK-TypeScript/${SDK_VERSION}`,
    },
    transformRequest: false,
    transformResponse: false,
    debug: config.debug || false,
  });
}

/**
 * Add authorization header to request config
 */
export function withAuth(
  config: { headers?: Record<string, string> } = {},
  token: string
): { headers: Record<string, string> } {
  return {
    ...config,
    headers: {
      ...config.headers,
      Authorization: `Bearer ${token}`,
    },
  };
}
