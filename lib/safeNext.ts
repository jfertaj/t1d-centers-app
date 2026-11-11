// lib/safeNext.ts
// The post-login destination comes from the URL (?next=) or the OIDC state,
// so it is attacker-controlled. Only same-origin relative paths are allowed:
// an absolute URL is an open redirect, and router.replace('javascript:...')
// runs script in this origin, where the admin's tokens live (localStorage).
export const DEFAULT_NEXT = '/sites/create';

export function safeNext(raw: unknown): string {
  if (typeof raw !== 'string' || !raw.startsWith('/')) return DEFAULT_NEXT;
  if (raw.startsWith('//') || raw.startsWith('/\\')) return DEFAULT_NEXT;
  return raw;
}
