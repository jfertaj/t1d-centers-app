'use client';

import { useAuth } from 'react-oidc-context';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function CallbackPage() {
  const auth = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!auth.isLoading && auth.isAuthenticated) {
      document.cookie = `idToken=${auth.user?.id_token}; path=/`;
      router.push('/sites/create');
    }
  }, [auth, router]);

  if (auth.isLoading) return <p>Completing login...</p>;
  return <p>Finishing authentication...</p>;
}