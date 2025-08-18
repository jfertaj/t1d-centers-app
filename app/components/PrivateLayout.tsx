// app/components/PrivateLayout.tsx
'use client';

import { useAuth } from 'react-oidc-context';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, ReactNode } from 'react';
import { useCognitoGroups } from '@lib/hooks/useCognitoGroups';
import HeaderWithLogout from '@/app/components/HeaderWithLogout';

// 👇 rutas que NO exigen login
const PUBLIC_PATHS = new Set<string>([
  '/',               // landing pública
  '/login',          // inicia el flujo OIDC
  '/login/callback', // ✅ importante para el retorno de Cognito
  '/not-authorized',
  '/error',
]);

export default function PrivateLayout({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const router = useRouter();
  const pathname = usePathname() || '/';
  const groups = useCognitoGroups();

  const isPublic = PUBLIC_PATHS.has(pathname);
  const isAdmin = groups.includes('admin');
  const isAdminRoute = pathname.startsWith('/admin');

  useEffect(() => {
    if (auth.isLoading) return;

    // Rutas públicas: render directo
    if (isPublic) return;

    // Rutas privadas: si no hay sesión -> /login con ?next
    if (!auth.isAuthenticated) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
      return;
    }

    // Rutas admin: exigir grupo admin
    if (isAdminRoute && !isAdmin) {
      router.replace('/not-authorized');
    }
  }, [auth.isLoading, auth.isAuthenticated, isPublic, isAdminRoute, isAdmin, pathname, router]);

  // Loader mientras resolvemos el estado OIDC
  if (auth.isLoading) {
    return <p className="text-center text-gray-600 py-12">Loading...</p>;
  }

  // Si no autenticado en ruta privada, no pintes (redirigiendo)
  if (!isPublic && !auth.isAuthenticated) return null;

  // Si no autorizado en /admin, no pintes (redirigiendo)
  if (isAdminRoute && auth.isAuthenticated && !isAdmin) return null;

  // ✅ En rutas privadas y con sesión, muestra el header
  if (!isPublic && auth.isAuthenticated) {
    return (
      <>
        <HeaderWithLogout />
        <main>{children}</main>
      </>
    );
  }

  // Rutas públicas
  return <>{children}</>;
}