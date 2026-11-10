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
  refreshing ??= um.signinSilent().catch(() => null).finally(() => { refreshing = null; });
  return refreshing;
}

// A session that can no longer produce a valid token (refresh token expired or
// revoked) would otherwise leave the UI "signed in" while every save fails.
async function endDeadSession(): Promise<void> {
  await getUserManager().removeUser().catch(() => undefined);
  const next = encodeURIComponent(window.location.pathname + window.location.search);
  window.location.assign(`/login?next=${next}`);
}

export async function authFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const user = await currentUser();
  const token = user && !user.expired ? user.access_token : null;
  if (!token) {
    await endDeadSession();
    throw new Error('Session expired');
  }
  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${token}`);
  const res = await fetch(input, { ...init, headers });
  if (res.status === 401) await endDeadSession();
  return res;
}
