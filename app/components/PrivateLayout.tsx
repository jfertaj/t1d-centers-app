'use client';

import { useAuth } from 'react-oidc-context';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, ReactNode } from 'react';
import { useCognitoGroups } from '@lib/hooks/useCognitoGroups';

export default function PrivateLayout({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const groups = useCognitoGroups();

  const isAdmin = groups.includes('admin');
  const isAdminRoute = pathname.startsWith('/admin');

  useEffect(() => {
    if (auth.isAuthenticated && isAdminRoute && !isAdmin) {
      router.push('/not-authorized');
    }
  }, [auth.isAuthenticated, isAdminRoute, isAdmin, router]);

  if (!auth.isAuthenticated) {
    return <p className="text-center text-gray-600">Loading...</p>;
  }

  return <>{children}</>;
}