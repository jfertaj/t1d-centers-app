'use client';

import { useAuth } from 'react-oidc-context';
import { useRouter } from 'next/navigation';
import { userManager } from '@lib/auth';
import { useCognitoGroups } from '@lib/hooks/useCognitoGroups';
import { Settings, List } from 'lucide-react'; // 👈 Iconos corporativos

export default function HeaderWithLogout() {
  const auth = useAuth();
  const router = useRouter();
  const groups = useCognitoGroups();
  const isAdmin = groups.includes('admin');

  const handleLogout = async () => {
    try {
      await userManager.removeUser(); // 🔒 limpiar sesión local
      const clientId = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID!;
      const logoutUri = process.env.NEXT_PUBLIC_COGNITO_LOGOUT_URI!;
      const cognitoDomain = process.env.NEXT_PUBLIC_COGNITO_DOMAIN!;
      window.location.href = `${cognitoDomain}/logout?client_id=${clientId}&logout_uri=${encodeURIComponent(
        logoutUri,
      )}`;
    } catch (err) {
      console.error('❌ Error during logout:', err);
    }
  };

  if (!auth.isAuthenticated) return null;

  return (
    <header className="w-full bg-white px-6 py-4 shadow-md border-b border-gray-200 z-50">
      <div className="max-w-5xl mx-auto flex items-center justify-between">
        {/* Logo + título */}
        <div className="flex items-center space-x-3">
          <img src="/innodia_cristal.png" alt="INNODIA Logo" className="w-10 h-10" />
          <h1 className="text-xl font-bold text-inodia-blue">INNODIA Clinical Centers</h1>
        </div>

        {/* Botones */}
        <div className="flex items-center space-x-4">
          {auth.user?.profile?.email && (
            <span className="text-sm text-gray-700 hidden sm:inline">
              👤 {auth.user.profile.email}
            </span>
          )}

          {isAdmin && (
            <>
              {/* Admin Panel */}
              <button
                onClick={() => router.push('/admin')}
                className="flex items-center gap-2 text-sm font-medium text-white bg-gray-700 border border-gray-700 px-4 py-2 rounded-lg hover:bg-gray-900 transition"
              >
                <Settings className="w-4 h-4" /> Admin Panel
              </button>

              {/* Sites List */}
              <button
                onClick={() => router.push('/sites/list')}
                className="flex items-center gap-2 text-sm font-medium text-inodia-blue border border-inodia-blue px-4 py-2 rounded-lg hover:bg-inodia-blue hover:text-white transition"
              >
                <List className="w-4 h-4" /> Sites List
              </button>
            </>
          )}

          {!isAdmin && (
            <button
              onClick={() => router.push('/sites/list')}
              className="flex items-center gap-2 text-sm font-medium text-inodia-blue border border-inodia-blue px-4 py-2 rounded-lg hover:bg-inodia-blue hover:text-white transition"
            >
              <List className="w-4 h-4" /> Sites List
            </button>
          )}

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="text-sm font-medium text-white bg-inodia-blue hover:bg-blue-700 px-4 py-2 rounded-lg transition"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}