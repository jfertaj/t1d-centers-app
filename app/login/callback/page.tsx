// app/login/callback/page.tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { userManager } from '@/lib/auth';

export default function CallbackPage() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await userManager.signinRedirectCallback();

        let next = '/sites/create';
        if (res?.state) {
          try {
            const parsed = JSON.parse(res.state as string);
            if (parsed.next) next = parsed.next;
          } catch {
            // si no se puede parsear, ignoramos
          }
        }

        if (!cancelled) router.replace(next);
      } catch {
        if (!cancelled) router.replace('/sites/create');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <div className="container-box text-center">
      <img src="/innodia_cristal.png" alt="INNODIA Logo" className="logo-image mx-auto mb-4" />
      <p className="subtitle">Finishing authentication…</p>
      <div className="w-6 h-6 border-4 border-inodia-blue border-t-transparent rounded-full animate-spin mx-auto mt-2" />
    </div>
  );
}