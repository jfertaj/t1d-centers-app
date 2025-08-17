// app/components/LoginButtons.tsx
'use client';

import { useAuth } from 'react-oidc-context';
import { userManager, signOutRedirect } from '@lib/auth';

export default function LoginButtons() {
  const auth = useAuth();

  // ❌ Ocultar botones si no hay sesión
  if (!auth.isAuthenticated) return null;

  return (
    <div className="flex justify-center gap-4 mt-4">
      <button onClick={() => userManager.signinRedirect()} className="button-blue">
        Sign In
      </button>
      <button onClick={() => signOutRedirect()} className="button-gray">
        Sign Out
      </button>
    </div>
  );
}