// components/InactivityModal.tsx
'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from 'react-oidc-context';
import { userManager } from '@lib/auth';

export default function InactivityModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const auth = useAuth();

  const handleLogout = async () => {
    await userManager.removeUser();
    router.push('/login');
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-box">
        <h2 className="modal-title">Session Timeout</h2>
        <p className="modal-text">You've been inactive. Do you want to continue your session?</p>
        <div className="modal-actions">
          <button onClick={onClose} className="button-blue">Continue</button>
          <button onClick={handleLogout} className="button-gray">Logout</button>
        </div>
      </div>
    </div>
  );
}