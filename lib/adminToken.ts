// lib/adminToken.ts
// Server-side verification of the Cognito access token that the browser sends
// as `Authorization: Bearer <token>`. Used by middleware.ts to protect every
// /api/* route: the admin UI's guard (withAdmin) only runs in the browser, so
// without this check the routes were callable by anyone with curl.
//
// Edge-runtime safe (jose uses Web Crypto), so it can run inside middleware.
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';
import { ADMIN_GROUP, groupsOf } from '@lib/groups';

const ISSUER = process.env.NEXT_PUBLIC_COGNITO_AUTHORITY || process.env.NEXT_PUBLIC_COGNITO_ISSUER || '';
const CLIENT_ID = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID || '';

// jose caches the keys and rate-limits refetches for the life of the runtime.
const JWKS = ISSUER ? createRemoteJWKSet(new URL(`${ISSUER}/.well-known/jwks.json`)) : null;

export type AdminTokenError = { status: 401 | 403 | 500; error: string };

/** Returns null when the caller is a signed-in admin, otherwise why not. */
export async function adminTokenError(authorization: string | null): Promise<AdminTokenError | null> {
  // Fail closed: a deploy without the Cognito env must not become an open API.
  if (!JWKS || !CLIENT_ID) return { status: 500, error: 'Auth is not configured' };

  const token = authorization?.match(/^Bearer\s+(\S+)$/i)?.[1];
  if (!token) return { status: 401, error: 'Missing bearer token' };

  let claims: JWTPayload;
  try {
    ({ payload: claims } = await jwtVerify(token, JWKS, { issuer: ISSUER }));
  } catch {
    return { status: 401, error: 'Invalid or expired token' };
  }

  // Cognito access tokens carry `client_id` (not `aud`) and `token_use: access`.
  if (claims.token_use !== 'access' || claims.client_id !== CLIENT_ID) {
    return { status: 401, error: 'Wrong token type or client' };
  }
  if (!groupsOf(claims).includes(ADMIN_GROUP)) {
    return { status: 403, error: 'Admin group required' };
  }
  return null;
}

/** Headers that pass the caller's token on to the API Gateway (JWT authorizer). */
export function forwardAuth(req: Request): Record<string, string> {
  const authorization = req.headers.get('authorization');
  return authorization ? { Authorization: authorization } : {};
}
