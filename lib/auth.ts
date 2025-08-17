// lib/auth.ts
import { UserManager } from 'oidc-client-ts';

const cognitoAuthConfig = {
  authority: process.env.NEXT_PUBLIC_COGNITO_AUTHORITY!,
  client_id: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID!,
  redirect_uri: process.env.NEXT_PUBLIC_COGNITO_REDIRECT_URI!,
  response_type: 'code',
  scope: 'openid',
};

export const userManager = new UserManager(cognitoAuthConfig);

export function signOutRedirect() {
  const clientId = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID!;
  const logoutUri = process.env.NEXT_PUBLIC_COGNITO_LOGOUT_URI!;
  const cognitoDomain = process.env.NEXT_PUBLIC_COGNITO_DOMAIN!;
  window.location.href = `${cognitoDomain}/logout?client_id=${clientId}&logout_uri=${encodeURIComponent(logoutUri)}`;
}

export async function clearOidcSession() {
  try {
    await userManager.clearStaleState();
    await userManager.removeUser();
    console.log('✅ OIDC session cleared');
  } catch (error) {
    console.error('❌ Error clearing OIDC session', error);
  }
}