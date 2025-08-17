// app/page.tsx
'use client';

import { useAuth } from 'react-oidc-context';
import LoginButtons from './components/LoginButtons';

export default function HomePage() {
  const auth = useAuth();

  if (auth.isLoading) return <p>Loading...</p>;

  if (!auth.isAuthenticated) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold">Welcome to Early Navigator Center App</h1>
        <p className="mb-4">Please sign in to continue.</p>
        <LoginButtons />
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold">Welcome back, {auth.user?.profile.name || 'user'}!</h1>
      <p>Your email is {auth.user?.profile.email}</p>
      <LoginButtons />
    </div>
  );
}