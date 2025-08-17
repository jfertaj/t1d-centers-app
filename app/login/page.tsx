'use client';

import { useAuth } from 'react-oidc-context';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { clearOidcSession } from '@lib/auth';

export default function LoginPage() {
  const auth = useAuth();
  const router = useRouter();

  useEffect(() => {
    clearOidcSession();
  }, []);

  useEffect(() => {
    if (auth.isAuthenticated) {
      const timeout = setTimeout(() => {
        router.push('/sites/create');
      }, 1500);
      return () => clearTimeout(timeout);
    }
  }, [auth.isAuthenticated, router]);

  if (auth.isLoading) {
    return (
      <div className="container-box text-center">
        <img src="/innodia_cristal.png" alt="INNODIA Logo" className="logo-image mx-auto mb-4" />
        <p className="subtitle">Loading authentication...</p>
      </div>
    );
  }

  if (auth.isAuthenticated) {
    return (
      <div className="container-box text-center">
        <img src="/innodia_cristal.png" alt="INNODIA Logo" className="logo-image mx-auto mb-4" />
        <div className="flex flex-col items-center justify-center space-y-2">
          <p className="subtitle">Redirecting to your dashboard...</p>
          <div className="w-6 h-6 border-4 border-inodia-blue border-t-transparent rounded-full animate-spin" />
        </div>
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