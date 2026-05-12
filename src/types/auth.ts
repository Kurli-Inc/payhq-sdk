/**
 * Authentication type definitions for OAuth 2.0 flow
 */

/**
 * OAuth 2.0 grant types supported by Payfirma
 */
export type GrantType =
  | 'client_credentials'
  | 'authorization_code'
  | 'refresh_token';

/**
 * OAuth 2.0 response types
 */
export type ResponseType = 'code';

/**
 * OAuth 2.0 token types
 * Note: API returns lowercase 'bearer' but we also support uppercase for compatibility
 */
export type TokenType = 'Bearer' | 'bearer';

/**
 * OAuth 2.0 scopes available
 */
export type OAuthScope = 'invoice' | 'ecom' | 'terminal' | 'eft';

/**
 * Authorization request parameters
 */
export interface AuthorizationRequest {
  /** Must be 'code' for authorization code flow */
  response_type: ResponseType;
  /** Client ID from PayHQ account */
  client_id: string;
  /** Redirect URI for authorization callback */
  redirect_uri: string;
  /** Optional state parameter for CSRF protection */
  state?: string;
  /** Requested scopes */
  scope?: OAuthScope[];
}

/**
 * Authorization response
 */
export interface AuthorizationResponse {
  /** Authorization code for token exchange */
  code: string;
  /** State parameter if provided in request */
  state?: string;
}

/**
 * Client credentials grant request
 */
export interface ClientCredentialsRequest {
  /** Grant type - must be 'client_credentials' */
  grant_type: 'client_credentials';
  /** Client ID */
  client_id: string;
  /** Client secret */
  client_secret: string;
  /** Requested scopes */
  scope?: OAuthScope[];
}

/**
 * Authorization code grant request
 */
export interface AuthorizationCodeRequest {
  /** Grant type - must be 'authorization_code' */
  grant_type: 'authorization_code';
  /** Authorization code received from authorization flow */
  code: string;
  /** Redirect URI used in authorization request */
  redirect_uri: string;
  /** State parameter for CSRF protection */
  state?: string;
  /** Client ID */
  client_id: string;
  /** Client secret */
  client_secret: string;
}

/**
 * Refresh token grant request
 */
export interface RefreshTokenRequest {
  /** Grant type - must be 'refresh_token' */
  grant_type: 'refresh_token';
  /** Refresh token from previous authentication */
  refresh_token: string;
  /** Client ID */
  client_id: string;
  /** Client secret */
  client_secret: string;
}

/**
 * Token response from OAuth 2.0 flow
 */
export interface TokenResponse {
  /** Access token for API requests */
  access_token: string;
  /** Token type - 'bearer' (lowercase from API) */
  token_type: TokenType;
  /** Token expiry time in seconds */
  expires_in: number;
  /** Refresh token for getting new access tokens (not present in client_credentials grant) */
  refresh_token?: string;
  /** Merchant ID associated with the token (may be omitted by API in some flows) */
  merchant_id?: string;
  /** Granted scopes as space-separated string (may be omitted by API in some flows) */
  scope?: string;
}

/**
 * Parsed JWT token payload
 */
export interface JWTPayload {
  /** Access token ID */
  access_token: string;
  /** Token expiry timestamp */
  exp: number;
  /** Token issued at timestamp */
  iat?: number;
  /** Merchant ID */
  merchant_id?: string;
  /** Client ID */
  client_id?: string;
  /** Granted scopes */
  scope?: string[];
}

/**
 * Token revocation request
 */
export interface TokenRevocationRequest {
  /** Token to revoke */
  token: string;
  /** Type of token being revoked */
  token_type_hint?: 'access_token' | 'refresh_token';
}

/**
 * Authentication credentials for API requests
 */
export interface AuthCredentials {
  /** Access token */
  access_token: string;
  /** Refresh token */
  refresh_token?: string;
  /** Token expiry timestamp */
  expires_at: number;
  /** Merchant ID */
  merchant_id?: string;
  /** Token scopes */
  scope?: string[];
}

/**
 * Basic authentication header
 */
export interface BasicAuthHeader {
  /** Base64 encoded 'client_id:client_secret' */
  Authorization: string;
}

/**
 * Bearer authentication header
 */
export interface BearerAuthHeader {
  /** Bearer token for API requests */
  Authorization: string;
}

/**
 * Token validation result
 */
export interface TokenValidation {
  /** Whether token is valid */
  valid: boolean;
  /** Token expiry timestamp */
  expires_at?: number;
  /** Reason for invalidity */
  reason?: string;
  /** Whether token needs refresh */
  needs_refresh?: boolean;
}
