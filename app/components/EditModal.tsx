// app/components/EditModal.tsx
'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

type Center = {
  id: number;
  name: string;
  address: string;
  city: string;
  country: string;
  zip_code: string;
  contact_name_1: string;
  email_1: string;
  phone_1: string;
  contact_name_2: string;
  email_2: string;
  phone_2: string;
  contact_name_3: string;
  email_3: string;
  phone_3: string;
};

type EditCenterModalProps = {
  isOpen: boolean;
  center: Center | null;
  onClose: () => void;
  onSave: (updated: Center) => void;
};

export default function EditModal({ isOpen, center, onClose, onSave }: EditCenterModalProps) {
  const [form, setForm] = useState<Center | null>(center);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(center);
  }, [center]);

  const handleChange = (field: keyof Center, value: string) => {
    if (!form) return;
    setForm({ ...form, [field]: value });
  };

  const handleSave = async () => {
    if (!form) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/sites/admin/update/${form.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody?.error || 'Failed to update center');
      }

      const data = await res.json();
      const updated: Center = data.center ?? form;

      onSave(updated);                    // ✅ actualiza tabla
      toast.success(`Saved: ${updated.name}`); // ✅ toast éxito
      onClose();                          // ✅ cierra modal
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen || !form) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-xl max-w-xl w-full p-6">
        <h2 className="text-xl font-bold text-inodia-blue mb-4">Edit center</h2>

        <div className="grid grid-cols-2 gap-4 max-h-[70vh] overflow-auto pr-1">
          {([
            'name', 'address', 'city', 'country', 'zip_code',
            'contact_name_1', 'email_1', 'phone_1',
            'contact_name_2', 'email_2', 'phone_2',
            'contact_name_3', 'email_3', 'phone_3',
          ] as (keyof Center)[]).map((field) => (
            <div key={String(field)} className="col-span-1">
              <label className="block text-sm text-gray-600 mb-1 capitalize">
                {String(field).replace(/_/g, ' ')}
              </label>
              <input
                className="w-full border border-gray-300 rounded-md p-2 text-sm disabled:opacity-50"
                type="text"
                value={form[field] ?? ''}
                onChange={(e) => handleChange(field, e.target.value)}
                disabled={saving}
              />
            </div>
          ))}
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-md disabled:opacity-50"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </button>

          <button
            className="px-6 py-2 bg-inodia-blue text-white rounded-md font-medium hover:bg-blue-700 disabled:opacity-50"
            onClick={handleSave}
            disabled={saving}
            aria-busy={saving}
          >
            {saving ? (
              <span className="inline-flex items-center gap-2">
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" className="opacity-25" />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0A12 12 0 000 12h4z"
                  />
                </svg>
                Saving…
              </span>
            ) : (
              'Save'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}