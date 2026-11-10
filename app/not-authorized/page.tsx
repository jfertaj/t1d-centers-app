// app/not-authorized/page.tsx
'use client';

import { signOutRedirect } from '@lib/auth';

// Reached by signed-in users outside the `admin` group, e.g. an INNODIA
// colleague who signed in with Microsoft before being granted access. They
// need a way out: after an admin adds them to the group they must sign in
// again to get a token that carries it.
export default function NotAuthorized() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-2xl shadow-lg text-center max-w-md">
        <h1 className="text-2xl font-bold text-red-600 mb-4">🚫 Access Denied</h1>
        <p className="text-gray-700">You do not have permission to access this page.</p>
        <p className="text-gray-600 text-sm mt-2">
          Ask an administrator to grant you access, then sign in again.
        </p>
        <button onClick={() => signOutRedirect()} className="button-blue mt-6">
          Sign out
        </button>
      </div>
    </div>
  );
}
