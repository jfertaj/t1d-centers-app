// app/login/page.tsx
'use client';

import { useAuth } from 'react-oidc-context';
import { useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { userManager } from '@lib/auth';

const getRedirectUri = () =>
  process.env.NEXT_PUBLIC_COGNITO_REDIRECT_URI ||
  (typeof window !== 'undefined'
    ? `${window.location.origin}/login/callback`
    : '/login/callback');

export default function LoginPage() {
  const auth = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  // a dónde volver tras el login
  const next = searchParams.get('next') || '/sites/create';
  const redirectUri = getRedirectUri();

  // ya autenticado → redirige
  useEffect(() => {
    if (auth.isAuthenticated) {
      const t = setTimeout(() => router.replace(next), 600);
      return () => clearTimeout(t);
    }
  }, [auth.isAuthenticated, next, router]);

  // evita lanzar login si aún carga el provider
  const canTriggerLogin = useMemo(
    () => !auth.isAuthenticated && !auth.isLoading && !auth.error,
    [auth.isAuthenticated, auth.isLoading, auth.error]
  );

  const startLogin = async () => {
    // Limpia estados antiguos (evita "No matching state" si hubo intentos fallidos previos)
    try {
      await userManager.clearStaleState();
    } catch (e) {
      console.warn('Error clearing stale state:', e);
    }

    // Pasamos redirect_uri y guardamos "next" dentro de state (OIDC permite usarlo de forma opaca)
    auth.signinRedirect?.({
      redirect_uri: redirectUri,
      state: JSON.stringify({ next }),
    });
  };

  // Si quieres auto‑redirigir al Hosted UI al entrar en /login, descomenta:
  // useEffect(() => { if (canTriggerLogin) startLogin(); }, [canTriggerLogin]);

  if (auth.isLoading) {
    return (
      <div className="container-box text-center">
        <img src="/innodia_cristal.png" alt="INNODIA Logo" className="logo-image mx-auto mb-4" />
        <p className="subtitle">Loading authentication…</p>
      </div>
    );
  }

  if (auth.isAuthenticated) {
    return (
      <div className="container-box text-center">
        <img src="/innodia_cristal.png" alt="INNODIA Logo" className="logo-image mx-auto mb-4" />
        <div className="flex flex-col items-center justify-center space-y-2">
          <p className="subtitle">Redirecting…</p>
          <div className="w-6 h-6 border-4 border-inodia-blue border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (auth.error) {
    return (
      <div className="container-box text-center">
        <img src="/innodia_cristal.png" alt="INNODIA Logo" className="logo-image mx-auto mb-4" />
        <p className="subtitle text-red-600">Login error: {String(auth.error)}</p>
        <button onClick={startLogin} className="button-blue mt-4">Try again</button>
      </div>
    );
  }

  return (
    <div className="container-box text-center">
      <div className="logo-container mb-6 justify-center">
        <img src="/innodia_cristal.png" alt="INNODIA Logo" className="logo-image" />
        <h1 className="title">Secure Login</h1>
      </div>
      <p className="subtitle mb-6">Please log in to access the clinical centers dashboard.</p>
      <button onClick={startLogin} className="button-blue">Sign in with Cognito</button>
    </div>
  );
}