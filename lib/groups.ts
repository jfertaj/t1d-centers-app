// lib/groups.ts
// Single parser for the Cognito `cognito:groups` claim, shared by the client
// guards (useCognitoGroups) and the server middleware (adminToken). No imports,
// so it is safe in the edge runtime and in client bundles.
export const ADMIN_GROUP = 'admin';

/** Accepts the array Cognito issues, plus "a,b" and "[a b]" string forms. */
export function groupsOf(claims: Record<string, unknown> | null | undefined): string[] {
  const raw = claims?.['cognito:groups'];
  if (Array.isArray(raw)) return raw.map(String);
  if (typeof raw !== 'string') return [];
  return raw.replace(/^\[|\]$/g, '').split(/[\s,]+/).filter(Boolean);
}
