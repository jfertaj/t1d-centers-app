// lib/authFetch.ts
// Client-side fetch that attaches the signed-in user's Cognito access token.
// Both this app's /api/* routes (middleware.ts) and the API Gateway (JWT
// authorizer) reject admin calls without it.
//
// automaticSilentRenew (lib/auth.ts) keeps the token fresh while the tab is
// active; the on-demand refresh here covers a tab waking from sleep with an
// already-expired token. Concurrent callers share one refresh.
import type { User } from 'oidc-client-ts';
import { getUserManager } from '@lib/auth';

let refreshing: Promise<User | null> | null = null;

async function currentUser(): Promise<User | null> {
  const um = getUserManager();
  const user = await um.getUser();
  if (!user?.expired || !user.refresh_token) return user;
  // On failure send the request unauthenticated and let the 401 surface.
  refreshing ??= um.signinSilent().catch(() => null).finally(() => { refreshing = null; });
  return refreshing;
}

export async function authFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const user = await currentUser();
  const headers = new Headers(init.headers);
  if (user?.access_token && !user.expired) {
    headers.set('Authorization', `Bearer ${user.access_token}`);
  }
  return fetch(input, { ...init, headers });
}
