// app/components/PrivateLayout.tsx
'use client';

import { useAuth } from 'react-oidc-context';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, ReactNode } from 'react';
import { useCognitoGroups } from '../hooks/useCognitoGroups';

// 👇 solo estas rutas NO exigen login
const PUBLIC_PATHS = new Set<string>([
  '/',               // landing pública
  '/login',          // página que inicia el flujo OIDC
  '/not-authorized', // errores
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

    // Rutas públicas: render directo (sin exigir login)
    if (isPublic) return;

    // Rutas privadas: si no hay sesión -> a /login con ?next
    if (!auth.isAuthenticated) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
      return;
    }

    // Rutas /admin: exigir grupo admin
    if (isAdminRoute && !isAdmin) {
      router.replace('/not-authorized');
    }
  }, [auth.isLoading, auth.isAuthenticated, isPublic, isAdminRoute, isAdmin, pathname, router]);

  // Loader breve mientras esperamos a que el provider termine
  if (auth.isLoading) {
    return <p className="text-center text-gray-600 py-12">Loading...</p>;
  }

  // Si no autenticado y la ruta no es pública, no pintes (redirigiendo)
  if (!isPublic && !auth.isAuthenticated) return null;

  // Si es ruta admin pero el usuario no es admin, no pintes (redirigiendo)
  if (isAdminRoute && auth.isAuthenticated && !isAdmin) return null;

  return <>{children}</>;
}