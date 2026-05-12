/**
 * Returns the token portion of an `Authorization: Bearer <token>` header value.
 */
export function stripBearerToken(authorization: string): string {
  const trimmed = authorization.trim();
  const match = trimmed.match(/^Bearer\s+(.*)$/i);
  const token = match?.[1];
  return token !== undefined ? token.trim() : trimmed;
}
