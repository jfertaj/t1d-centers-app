'use client';

import { useEffect, useState } from 'react';
import { useAuth } from 'react-oidc-context';
import { useRouter, usePathname } from 'next/navigation';
import { useCognitoGroups } from '@lib/hooks/useCognitoGroups';

export default function withAdmin<P>(Wrapped: React.ComponentType<P>) {
  return function AdminGuard(props: P) {
    const auth = useAuth();
    const router = useRouter();
    const pathname = usePathname();

    // ✅ grupos normalizados y tipados: string[]
    const groups = useCognitoGroups();
    const isAdmin = groups.includes('admin');

    const [authorized, setAuthorized] = useState(false);

    useEffect(() => {
      if (auth.isLoading) return;

      // no autenticado → manda a login (opcional: añade next)
      if (!auth.isAuthenticated) {
        router.push(`/login?next=${encodeURIComponent(pathname)}`);
        return;
      }

      // autenticado pero no admin → manda a not-authorized
      if (!isAdmin) {
        router.push('/not-authorized');
        return;
      }

      // autenticado + admin
      setAuthorized(true);
    }, [auth.isLoading, auth.isAuthenticated, isAdmin, router, pathname]);

    // placeholders mientras decidimos
    if (auth.isLoading || (!auth.isAuthenticated && !authorized)) {
      return <p className="text-center text-gray-600 py-12">Loading...</p>;
    }

    if (!authorized) return null;

    return <Wrapped {...props} />;
  };
}