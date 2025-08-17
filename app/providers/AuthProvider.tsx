'use client';

import { AuthProvider } from 'react-oidc-context';
import { userManager } from '@lib/auth';

export default function CognitoAuthProvider({ children }: { children: React.ReactNode }) {
  return <AuthProvider userManager={userManager}>{children}</AuthProvider>;
}