'use client';

import { useAuth } from 'react-oidc-context';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function withAdmin<P>(Component: React.ComponentType<P>) {
  return function AdminWrapper(props: P) {
    const auth = useAuth();
    const router = useRouter();
    const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

    useEffect(() => {
      if (!auth.isLoading && auth.user) {
        const groups: string[] = auth.user.profile['cognito:groups'] || [];

        if (groups.includes('admin')) {
          setIsAuthorized(true);
        } else {
          setIsAuthorized(false);
          router.replace('/unauthorized');
        }
      }
    }, [auth.isLoading, auth.user, router]);

    if (auth.isLoading || isAuthorized === null) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100">
          <div className="text-gray-600">Checking admin access...</div>
        </div>
      );
    }

    return <Component {...props} />;
  };
}