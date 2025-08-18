// app/login/callback/page.tsx
'use client';

import { useAuth } from 'react-oidc-context';
import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function CallbackPage() {
  const auth = useAuth();
  const router = useRouter();
  const sp = useSearchParams();

  useEffect(() => {
    // Intenta procesar el callback (si ya está procesado, ignoramos el error)
    Promise.resolve(auth.signinCallback?.())
      .catch(() => {})
      .finally(() => {
        // Recupera "next" del parámetro state (si lo mandamos desde /login)
        let next = '/sites/create';
        const rawState = sp.get('state');
        try {
          if (rawState) {
            const parsed = JSON.parse(rawState);
            if (parsed?.next && typeof parsed.next === 'string') next = parsed.next;
          }
        } catch {
          // state no era JSON; continuamos al default
        }

        // Opcional: cookie con idToken
        const token = auth.user?.id_token;
        if (token) {
          document.cookie = [
            `idToken=${token}`,
            'Path=/',
            'Secure',
            'SameSite=Lax',
          ].join('; ');
        }

        router.replace(next);
      });
  }, [auth, router, sp]);

  return (
    <div className="container-box text-center">
      <img src="/innodia_cristal.png" alt="INNODIA Logo" className="logo-image mx-auto mb-4" />
      <p className="subtitle">Completing login…</p>
      <div className="w-6 h-6 border-4 border-inodia-blue border-t-transparent rounded-full animate-spin mx-auto" />
    </div>
  );
}