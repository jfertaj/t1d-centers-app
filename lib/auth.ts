// lib/auth.ts
// Robusto para Next.js (App Router) + Cognito + oidc-client-ts

import { UserManager, WebStorageStateStore } from 'oidc-client-ts';

function getAuthority(): string {
  // RECOMENDADO: usar el issuer del pool (descubrimiento OIDC garantizado)
  // Formato: https://cognito-idp.<region>.amazonaws.com/<userPoolId>
  // Ej: https://cognito-idp.eu-west-1.amazonaws.com/eu-west-1_AbCdEf123
  const fromEnv =
    process.env.NEXT_PUBLIC_COGNITO_AUTHORITY ||
    process.env.NEXT_PUBLIC_COGNITO_ISSUER;

  if (!fromEnv) {
    throw new Error(
      'Missing NEXT_PUBLIC_COGNITO_AUTHORITY (or NEXT_PUBLIC_COGNITO_ISSUER) in env'
    );
  }
  return fromEnv;
}

function getRedirectUri(): string {
  const fromEnv = process.env.NEXT_PUBLIC_COGNITO_REDIRECT_URI;
  if (fromEnv) return fromEnv;
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/login/callback`;
  }
  // Valor de respaldo para compilación SSR (no se usa en runtime del cliente)
  return '/login/callback';
}

function getPostLogoutRedirectUri(): string {
  const fromEnv = process.env.NEXT_PUBLIC_COGNITO_LOGOUT_URI;
  if (fromEnv) return fromEnv;
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/login`;
  }
  return '/login';
}

// ⚠️ No crear instancias del UserManager en SSR
let _userManager: UserManager | null = null;

export function getUserManager(): UserManager {
  if (typeof window === 'undefined') {
    // Evita acceder a window/localStorage en el servidor
    throw new Error('UserManager requested on the server. Call this in client components only.');
  }
  if (_userManager) return _userManager;

  _userManager = new UserManager({
    authority: getAuthority(),
    client_id: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID!,
    redirect_uri: getRedirectUri(),
    post_logout_redirect_uri: getPostLogoutRedirectUri(),
    response_type: 'code',
    scope: 'openid email profile',
    // Almacenamiento en localStorage del navegador
    userStore: new WebStorageStateStore({ store: window.localStorage }),
    // Renovación silenciosa (si en el futuro habilitas iframe de silent renew)
    automaticSilentRenew: false,
    // timeouts por defecto están bien; puedes ajustarlos si lo necesitas
  });

  return _userManager;
}

// Para AuthProvider: crea el userManager solo en cliente
export const userManager =
  typeof window !== 'undefined' ? getUserManager() : (null as unknown as UserManager);

// Sign‑out usando el flujo del SDK (mejor que construir URL a mano)
export async function signOutRedirect() {
  if (typeof window === 'undefined') return;
  try {
    const um = getUserManager();
    await um.signoutRedirect();
  } catch (e) {
    // Fallback: Hosted UI /logout directo
    const domain = process.env.NEXT_PUBLIC_COGNITO_DOMAIN!;
    const clientId = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID!;
    const logoutUri = getPostLogoutRedirectUri();
    window.location.href = `${domain}/logout?client_id=${clientId}&logout_uri=${encodeURIComponent(
      logoutUri
    )}`;
  }
}

export async function clearOidcSession() {
  try {
    if (typeof window === 'undefined') return;
    const um = getUserManager();
    await um.clearStaleState();
    await um.removeUser();
    // console.log('✅ OIDC session cleared');
  } catch (error) {
    console.error('❌ Error clearing OIDC session', error);
  }
}