// app/login/page.tsx
'use client';

import { useAuth } from 'react-oidc-context';
import { useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function LoginPage() {
  const auth = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  // a dónde volver tras el login
  const next = searchParams.get('next') || '/sites/create';

  // cuando ya estás autenticado, redirige a "next"
  useEffect(() => {
    if (auth.isAuthenticated) {
      const t = setTimeout(() => router.replace(next), 600);
      return () => clearTimeout(t);
    }
  }, [auth.isAuthenticated, next, router]);

  // evita llamar a signinRedirect si el provider aún está cargando
  const canTriggerLogin = useMemo(() => {
    return !auth.isAuthenticated && !auth.isLoading && !auth.error;
  }, [auth.isAuthenticated, auth.isLoading, auth.error]);

  // si quieres auto‑redirigir al Hosted UI al entrar en /login, descomenta:
  // useEffect(() => {
  //   if (canTriggerLogin) auth.signinRedirect();
  // }, [canTriggerLogin, auth]);

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

  // error visible si algo fue mal en el callback
  if (auth.error) {
    return (
      <div className="container-box text-center">
        <img src="/innodia_cristal.png" alt="INNODIA Logo" className="logo-image mx-auto mb-4" />
        <p className="subtitle text-red-600">Login error: {String(auth.error)}</p>
        <button onClick={() => auth.signinRedirect()} className="button-blue mt-4">
          Try again
        </button>
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

      <button onClick={() => auth.signinRedirect()} className="button-blue">
        Sign in with Cognito
      </button>
    </div>
  );
}