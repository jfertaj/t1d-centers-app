// lib/adminToken.ts
// Server-side verification of the Cognito access token that the browser sends
// as `Authorization: Bearer <token>`. Used by middleware.ts to protect every
// /api/* route: the admin UI's guard (withAdmin) only runs in the browser, so
// without this check the routes were callable by anyone with curl.
//
// Edge-runtime safe (jose uses Web Crypto), so it can run inside middleware.
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';

export const ADMIN_GROUP = 'admin';

const ISSUER = process.env.NEXT_PUBLIC_COGNITO_AUTHORITY || process.env.NEXT_PUBLIC_COGNITO_ISSUER || '';
const CLIENT_ID = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID || '';

// Built lazily and cached for the lifetime of the runtime; jose caches the keys.
let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;
function getJwks() {
  if (!jwks) jwks = createRemoteJWKSet(new URL(`${ISSUER}/.well-known/jwks.json`));
  return jwks;
}

export type AdminCheck =
  | { ok: true; claims: JWTPayload }
  | { ok: false; status: 401 | 403 | 500; error: string };

export function bearerToken(authorization: string | null): string | null {
  const m = authorization?.match(/^Bearer\s+(\S+)$/i);
  return m ? m[1] : null;
}

/** Cognito puts groups in `cognito:groups` as an array. */
export function groupsOf(claims: JWTPayload): string[] {
  const raw = claims['cognito:groups'];
  return Array.isArray(raw) ? raw.map(String) : [];
}

export async function verifyAdminToken(authorization: string | null): Promise<AdminCheck> {
  // Fail closed: a deploy without the Cognito env must not become an open API.
  if (!ISSUER || !CLIENT_ID) return { ok: false, status: 500, error: 'Auth is not configured' };

  const token = bearerToken(authorization);
  if (!token) return { ok: false, status: 401, error: 'Missing bearer token' };

  let claims: JWTPayload;
  try {
    ({ payload: claims } = await jwtVerify(token, getJwks(), { issuer: ISSUER }));
  } catch {
    return { ok: false, status: 401, error: 'Invalid or expired token' };
  }

  // Cognito access tokens carry `client_id` (not `aud`) and `token_use: access`.
  if (claims.token_use !== 'access' || claims.client_id !== CLIENT_ID) {
    return { ok: false, status: 401, error: 'Wrong token type or client' };
  }
  if (!groupsOf(claims).includes(ADMIN_GROUP)) {
    return { ok: false, status: 403, error: 'Admin group required' };
  }
  return { ok: true, claims };
}

/** Headers that pass the caller's token on to the API Gateway (JWT authorizer). */
export function forwardAuth(req: Request): Record<string, string> {
  const authorization = req.headers.get('authorization');
  return authorization ? { Authorization: authorization } : {};
}
