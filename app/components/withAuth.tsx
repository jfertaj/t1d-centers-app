'use client';

import { useAuth } from 'react-oidc-context';
import { useEffect } from 'react';

export default function withAuth<P>(Component: React.ComponentType<P>) {
  return function AuthenticatedComponent(props: P) {
    const auth = useAuth();

    useEffect(() => {
      if (!auth.isAuthenticated && !auth.isLoading) {
        auth.signinRedirect();
      }
    }, [auth]);

    if (auth.isLoading) return <p>Loading...</p>;

    if (auth.error) {
      return (
        <div className="text-red-600">
          Error during authentication: {auth.error.message}
        </div>
      );
    }

    if (!auth.isAuthenticated) {
      return <p>Redirecting to login...</p>;
    }

    return <Component {...props} />;
  };
}