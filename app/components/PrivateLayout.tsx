// app/components/PrivateLayout.tsx
'use client';

import { useAuth } from 'react-oidc-context';
import { usePathname, useRouter } from 'next/navigation';
import HeaderWithLogout from '@/components/HeaderWithLogout';
import { ReactNode, useEffect } from 'react';

export default function PrivateLayout({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const isPublic = pathname === '/' || pathname.startsWith('/login') || pathname.startsWith('/callback');
  const isAdminRoute = pathname.startsWith('/admin');

  useEffect(() => {
    if (!auth.isLoading && !auth.isAuthenticated && !isPublic) {
      router.push('/login');
    }

    if (
      !auth.isLoading &&
      auth.isAuthenticated &&
      isAdminRoute &&
      !auth.user?.profile['cognito:groups']?.includes('admin')
    ) {
      router.push('/not-authorized'); // o cualquier página de error personalizada
    }
  }, [auth.isLoading, auth.isAuthenticated, pathname, isPublic, isAdminRoute, router, auth.user]);

  if (auth.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 border-4 border-inodia-blue border-t-transparent rounded-full animate-spin" />
          <p className="text-inodia-blue font-semibold text-sm">Loading authentication...</p>
        </div>
      </div>
    );
  }

  if (isPublic || !auth.isAuthenticated) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen flex flex-col px-4 py-6 bg-gray-50">
      <HeaderWithLogout />
      <main className="flex-grow">{children}</main>
    </div>
  );
}