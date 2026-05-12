/** Fetch/runtime abort — AbortController surfaces as AbortError / ABORT_ERR (20). */
export function isAbortError(error: unknown): boolean {
  if (error == null || typeof error !== 'object') {
    return false;
  }
  const e = error as { name?: unknown; code?: unknown };
  if (e.name === 'AbortError') {
    return true;
  }
  return e.code === 20;
}

/**
 * Original fetch/abort error for `PayHQError.cause`.
 * Jest/jsdom `DOMException` is often not `instanceof Error` even though Node's is.
 */
export function asErrorCause(error: unknown): Error | undefined {
  if (error instanceof Error) {
    return error;
  }
  if (typeof DOMException !== 'undefined' && error instanceof DOMException) {
    return error;
  }
  return undefined;
}
