'use client';

import { useEffect, useState } from 'react';

type ConfirmModalProps = {
  isOpen: boolean;
  title: string;
  message: string;
  highlight?: string; // nombre del centro
  onConfirm: () => Promise<void> | void;
  onCancel: () => void;
};

export default function ConfirmModal({
  isOpen,
  title,
  message,
  highlight,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !deleting) onCancel();
    };
    if (isOpen) document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isOpen, deleting, onCancel]);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    try {
      setDeleting(true);
      await onConfirm();
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 text-center">
        <h2 className="text-xl font-bold text-inodia-blue mb-4">{title}</h2>

        <p className="text-gray-700 mb-6">
          {message}{' '}
          {highlight && (
            <span className="font-bold text-inodia-blue">“{highlight}”</span>
          )}
        </p>

        <div className="flex justify-center gap-4">
          <button
            onClick={onCancel}
            className="px-6 py-2 rounded-md bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium disabled:opacity-50"
            disabled={deleting}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="px-6 py-2 rounded-md bg-red-600 hover:bg-red-700 text-white font-medium disabled:opacity-50"
            disabled={deleting}
            aria-busy={deleting}
          >
            {deleting ? (
              <span className="inline-flex items-center gap-2">
                <svg
                  className="animate-spin w-4 h-4"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <circle
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                    className="opacity-25"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0A12 12 0 000 12h4z"
                  />
                </svg>
                Deleting…
              </span>
            ) : (
              'Confirm Deletion'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}