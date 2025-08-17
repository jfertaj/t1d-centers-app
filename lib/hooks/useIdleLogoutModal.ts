// lib/hooks/useIdleLogoutModal.ts
'use client';

import { useEffect, useRef, useState } from 'react';

export function useIdleLogoutModal(timeoutMinutes = 10) {
  const [showModal, setShowModal] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const resetTimer = () => {
      if (document.visibilityState !== 'visible') return; // solo si está activa
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        setShowModal(true); // mostrar modal
      }, timeoutMinutes * 60 * 1000);
    };

    const activityEvents = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    activityEvents.forEach((event) => window.addEventListener(event, resetTimer));
    document.addEventListener('visibilitychange', resetTimer);
    resetTimer();

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      activityEvents.forEach((event) => window.removeEventListener(event, resetTimer));
      document.removeEventListener('visibilitychange', resetTimer);
    };
  }, [timeoutMinutes]);

  const closeModal = () => setShowModal(false);

  return { showModal, closeModal };
}