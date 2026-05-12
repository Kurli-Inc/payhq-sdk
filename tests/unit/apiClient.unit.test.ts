/**
 * HttpClient timeout / abort behavior (fetch + AbortController).
 */

import { HttpClient } from '../../src/utils/apiClient';

describe('HttpClient', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('throws a clear timeout message when fetch rejects DOMException AbortError', async () => {
    jest
      .spyOn(global, 'fetch')
      .mockImplementation((_url, init?: RequestInit) => {
        return new Promise((_resolve, reject) => {
          const signal = init?.signal;
          if (!signal) {
            return;
          }
          signal.addEventListener('abort', () => {
            reject(
              new DOMException('This operation was aborted', 'AbortError')
            );
          });
        });
      });

    const client = new HttpClient({
      baseURL: 'http://localhost',
      timeout: 5000,
      headers: {},
    });

    const promise = client.request({ method: 'GET', url: '/api' });
    jest.advanceTimersByTime(5000);

    await expect(promise).rejects.toThrow('Request timeout after 5000ms');
  });

  it('maps abort-like rejection without Error prototype (name/code only)', async () => {
    jest
      .spyOn(global, 'fetch')
      .mockImplementation((_url, init?: RequestInit) => {
        return new Promise((_resolve, reject) => {
          const signal = init?.signal;
          if (!signal) {
            return;
          }
          signal.addEventListener('abort', () => {
            const err = Object.create(null) as {
              name: string;
              message: string;
              code: number;
            };
            err.name = 'AbortError';
            err.message = 'This operation was aborted';
            err.code = 20;
            reject(err);
          });
        });
      });

    const client = new HttpClient({
      baseURL: 'http://localhost',
      timeout: 100,
      headers: {},
    });

    const promise = client.request({ method: 'GET', url: '/api' });
    jest.advanceTimersByTime(100);

    await expect(promise).rejects.toThrow('Request timeout after 100ms');
  });
});
