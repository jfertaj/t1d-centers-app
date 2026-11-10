// lib/authFetch.ts
// Client-side fetch that attaches the signed-in user's Cognito access token.
// Both this app's /api/* routes (middleware.ts) and the API Gateway (JWT
// authorizer) reject admin calls without it.
'use client';

import { getUserManager } from '@lib/auth';

export async function authFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const um = getUserManager();
  let user = await um.getUser();
  if (user?.expired && user.refresh_token) {
    // Refresh-token grant; on failure send the request unauthenticated and let
    // the 401 surface instead of hanging the UI.
    user = await um.signinSilent().catch(() => null);
  }
  const headers = new Headers(init.headers);
  if (user?.access_token && !user.expired) {
    headers.set('Authorization', `Bearer ${user.access_token}`);
  }
  return fetch(input, { ...init, headers });
}
