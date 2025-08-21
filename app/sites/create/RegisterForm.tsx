'use client';

import React, { useRef, useState, forwardRef } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

type Form = {
  name: string;
  address: string;
  city: string;
  country: string;
  zip_code: string;
  type_of_ed: 'High Risk' | 'General Population' | 'Both' | '';
  detect_site: string;

  contact_name_1?: string; email_1?: string; phone_1?: string;
  contact_name_2?: string; email_2?: string; phone_2?: string;
  contact_name_3?: string; email_3?: string; phone_3?: string;
  contact_name_4?: string; email_4?: string; phone_4?: string;
  contact_name_5?: string; email_5?: string; phone_5?: string;
  contact_name_6?: string; email_6?: string; phone_6?: string;
};

const EU_COUNTRIES = [
  'Austria','Belgium','Bulgaria','Croatia','Cyprus','Czech Republic','Denmark','Estonia',
  'Finland','France','Germany','Greece','Hungary','Ireland','Italy','Latvia','Lithuania',
  'Luxembourg','Malta','Netherlands','Poland','Portugal','Romania','Slovakia','Slovenia',
  'Spain','Sweden','United Kingdom','Norway','Switzerland','Iceland','Andorra','Monaco',
  'San Marino','Liechtenstein'
];

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || '';

export default function RegisterForm() {
  const router = useRouter();

  const [form, setForm] = useState<Form>({
    name: '',
    address: '',
    city: '',
    country: '',
    zip_code: '',
    type_of_ed: '',
    detect_site: '',
  });

  const [errors, setErrors] = useState<Record<string,string>>({});
  const [contactError, setContactError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // —— UI: contactos opcionales
  const [showOptional, setShowOptional] = useState(false);
  const [additionalCount, setAdditionalCount] = useState(0); // 0..5 → Contact 2..6

  // —— Modal bloqueo geocodificación
  const [geoModalOpen, setGeoModalOpen] = useState(false);
  const [geoModalText, setGeoModalText] = useState('Address could not be geolocated. Please review and try again.');
  const [geoCandidate, setGeoCandidate] = useState<string | null>(null);

  // —— refs para llevar al usuario al campo Address al cerrar modal
  const addressRef = useRef<HTMLInputElement>(null);
  const cityRef = useRef<HTMLInputElement>(null);
  const zipRef = useRef<HTMLInputElement>(null);

  const set = (k: keyof Form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value as any }));

  // ——————————————————————————
  // Geocodificación previa contra Lambda/API Gateway
  // ——————————————————————————
  async function precheckGeocoding(): Promise<boolean> {
    if (!API_BASE) {
      toast.error('API base URL is not configured (NEXT_PUBLIC_API_BASE).');
      return false;
    }
    try {
      const payload = {
        address: form.address,
        city: form.city,
        zip_code: form.zip_code,
        country: form.country,
      };

      const res = await fetch(`${API_BASE}/geocoding/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({} as any));

      if (!res.ok) {
        setGeoCandidate(null);
        setGeoModalText('Address could not be geolocated. Please review and try again.');
        setGeoModalOpen(true);
        return false;
      }

      if (!data.ok) {
        // bloqueamos tanto en NO_RESULTS como en partial === true
        setGeoCandidate(data.formatted_address ?? null);
        setGeoModalText(
          data.partial
            ? 'The address was only partially matched. Please verify or refine it.'
            : 'Address could not be geolocated. Please review and try again.'
        );
        setGeoModalOpen(true);
        return false;
      }

      // ok === true → continuar
      return true;
    } catch {
      setGeoCandidate(null);
      setGeoModalText('Address could not be geolocated. Please review and try again.');
      setGeoModalOpen(true);
      return false;
    }
  }

  // helper: contacto válido si al menos 2 de 3 campos están rellenados
  const isContactValid = (name?: string, email?: string, phone?: string) => {
    let count = 0;
    if (name && name.trim()) count++;
    if (email && email.trim()) count++;
    if (phone && phone.trim()) count++;
    return count >= 2;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    const newErrors: Record<string,string> = {};
    if (!form.name.trim()) newErrors.name = 'Center name is required';
    if (!form.address.trim()) newErrors.address = 'Address is required';
    if (!form.city.trim()) newErrors.city = 'City is required';
    if (!form.country.trim()) newErrors.country = 'Country is required';
    if (!form.zip_code.trim()) newErrors.zip_code = 'ZIP code is required';
    if (!form.type_of_ed.trim()) newErrors.type_of_ed = 'Type of ED is required';
    setErrors(newErrors);

    // validar contactos (al menos 1 válido: 2 de 3 campos rellenados)
    const hasOneValidContact =
      isContactValid(form.contact_name_1, form.email_1, form.phone_1) ||
      isContactValid(form.contact_name_2, form.email_2, form.phone_2) ||
      isContactValid(form.contact_name_3, form.email_3, form.phone_3) ||
      isContactValid(form.contact_name_4, form.email_4, form.phone_4) ||
      isContactValid(form.contact_name_5, form.email_5, form.phone_5) ||
      isContactValid(form.contact_name_6, form.email_6, form.phone_6);

    if (!hasOneValidContact) {
      setContactError('Provide at least one contact with any two of Name, Email, Phone');
    } else {
      setContactError('');
    }

    if (Object.keys(newErrors).length > 0 || !hasOneValidContact) {
      return;
    }

    // Geocodificación previa (bloqueante si falla/partial)
    const geoOk = await precheckGeocoding();
    if (!geoOk) return;

    if (!API_BASE) {
      toast.error('API base URL is not configured (NEXT_PUBLIC_API_BASE).');
      return;
    }

    setSubmitting(true);
    try {
      const payload: Record<string, any> = { ...form };
      Object.keys(payload).forEach((k) => {
        if ((payload as any)[k] === '') (payload as any)[k] = null;
      });

      const res = await fetch(`${API_BASE}/centers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        throw new Error(txt || `Save failed (${res.status})`);
      }

      toast.success(`✅ Center "${form.name}" registered`);
      router.push('/admin');
    } catch (err) {
      console.error(err);
      toast.error('❌ Failed to register center');
    } finally {
      setSubmitting(false);
    }
  };

  const reset = () => {
    setForm({
      name: '',
      address: '',
      city: '',
      country: '',
      zip_code: '',
      type_of_ed: '',
      detect_site: '',
    });
    setErrors({});
    setContactError('');
    setShowOptional(false);
    setAdditionalCount(0);
  };

  const addAnotherContact = () => {
    if (additionalCount < 5) setAdditionalCount(additionalCount + 1); // hasta contact_6
  };

  return (
    <div className="px-4 py-10 bg-gray-100">
      <div className="max-w-5xl mx-auto bg-white rounded-2xl shadow p-6">
        <div className="flex items-center gap-3 mb-6">
          <img src="/innodia_cristal.png" alt="INNODIA" className="w-10 h-10" />
          <h1 className="text-2xl font-bold text-inodia-blue">Register a New Clinical Center</h1>
        </div>

        <form onSubmit={submit} className="space-y-8">
          {/* Core */}
          <fieldset className="border border-gray-200 rounded-lg p-4">
            <legend className="px-2 text-sm font-semibold text-gray-700">Center information</legend>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Center Name *" value={form.name} onChange={set('name')} error={errors.name} />
              <Input label="Address *" value={form.address} onChange={set('address')} error={errors.address} ref={addressRef} />
              <Input label="City *" value={form.city} onChange={set('city')} error={errors.city} ref={cityRef} />
              <Select
                label="Country *"
                value={form.country}
                onChange={set('country')}
                options={['', ...EU_COUNTRIES]}
                error={errors.country}
              />
              <Input label="ZIP Code *" value={form.zip_code} onChange={set('zip_code')} error={errors.zip_code} ref={zipRef} />
              <Select
                label="Type of ED *"
                value={form.type_of_ed}
                onChange={set('type_of_ed')}
                options={['', 'High Risk', 'General Population', 'Both']}
                error={errors.type_of_ed}
              />
              <Input label="Detect Site" value={form.detect_site} onChange={set('detect_site')} />
            </div>
          </fieldset>

          {/* Primary contact (siempre visible) */}
          <fieldset className="border border-gray-200 rounded-lg p-4">
            <legend className="px-2 text-sm font-semibold text-gray-700">
              Primary Contact (any two of: Name, Email, Phone)
            </legend>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input label="Name" value={form.contact_name_1 ?? ''} onChange={set('contact_name_1')} />
              <Input label="Email" type="email" value={form.email_1 ?? ''} onChange={set('email_1')} />
              <Input label="Phone" value={form.phone_1 ?? ''} onChange={set('phone_1')} />
            </div>
          </fieldset>

          {/* Toggle para contactos opcionales */}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setShowOptional((s) => !s)}
              className="text-sm font-medium text-inodia-blue border border-inodia-blue px-4 py-2 rounded-md hover:bg-inodia-blue hover:text-white transition cursor-pointer"
            >
              {showOptional ? 'Hide additional contacts' : 'Add additional contacts'}
            </button>

            {showOptional && additionalCount < 5 && (
              <button
                type="button"
                onClick={addAnotherContact}
                className="text-sm font-medium text-white bg-inodia-blue px-4 py-2 rounded-md hover:bg-blue-700 transition cursor-pointer"
              >
                + Add contact
              </button>
            )}
          </div>

          {/* Contactos 2..(1+additionalCount) dentro del colapsable */}
          {showOptional && (
            <div className="space-y-4">
              {Array.from({ length: additionalCount }, (_, i) => 2 + i).map((n) => (
                <fieldset key={n} className="border border-gray-200 rounded-lg p-4">
                  <legend className="px-2 text-sm font-semibold text-gray-700">Contact {n} (optional)</legend>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Input label="Name" value={(form as any)[`contact_name_${n}`] ?? ''} onChange={set(`contact_name_${n}` as any)} />
                    <Input label="Email" type="email" value={(form as any)[`email_${n}`] ?? ''} onChange={set(`email_${n}` as any)} />
                    <Input label="Phone" value={(form as any)[`phone_${n}`] ?? ''} onChange={set(`phone_${n}` as any)} />
                  </div>
                </fieldset>
              ))}
            </div>
          )}

          {contactError && <p className="text-sm text-red-600">{contactError}</p>}

          <div className="flex justify-between">
            <button type="button" onClick={() => router.push('/admin')} className="px-4 py-2 rounded-md border cursor-pointer">
              ← Back to list
            </button>
            <div className="flex gap-3">
              <button type="button" onClick={reset} className="px-4 py-2 rounded-md border cursor-pointer">
                Reset
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 bg-inodia-blue text-white rounded-md disabled:opacity-60 cursor-pointer"
              >
                {submitting ? 'Saving…' : 'Register'}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Modal bloqueo geocodificación */}
      {geoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-md w-full text-center">
            <div className="flex items-center justify-center mb-3">
              {/* Icono de advertencia amarillo */}
              <svg
                className="w-10 h-10 text-yellow-500"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.721-1.36 3.486 0l6.518 11.59c.75 1.334-.213 2.987-1.742 2.987H3.48c-1.53 0-2.492-1.653-1.742-2.987l6.519-11.59zM11 14a1 1 0 11-2 0 1 1 0 012 0zm-1-2a1 1 0 01-1-1V7a1 1 0 112 0v4a1 1 0 01-1 1z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              Address could not be geolocated
            </h2>
            <p className="text-sm text-gray-700">{geoModalText}</p>
            {geoCandidate && (
              <p className="text-sm text-gray-700 mt-2">
                Candidate match: <span className="font-medium italic">{geoCandidate}</span>
              </p>
            )}
            <div className="mt-6">
              <button
                onClick={() => {
                  setGeoModalOpen(false);
                  setTimeout(() => {
                    addressRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    addressRef.current?.focus();
                  }, 0);
                }}
                className="px-5 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 cursor-pointer"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- Inputs ---------- */

const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string }>(
  ({ label, error, ...rest }, ref) => (
    <label className="block">
      <span className="block text-sm text-gray-700 mb-1">{label}</span>
      <input
        ref={ref}
        {...rest}
        className={`w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 ${
          error ? 'border-red-500' : 'border-gray-300'
        }`}
      />
      {error && <p className="text-sm text-red-600 mt-1">{error}</p>}
    </label>
  )
);
Input.displayName = 'Input';

function Select({
  label, options, error, ...rest
}: React.SelectHTMLAttributes<HTMLSelectElement> & { label: string; options: string[]; error?: string }) {
  return (
    <label className="block">
      <span className="block text-sm text-gray-700 mb-1">{label}</span>
      <select
        {...rest}
        className={`w-full rounded-md border px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-200 ${
          error ? 'border-red-500' : 'border-gray-300'
        }`}
      >
        {options.map((opt) => (
          <option key={opt || 'empty'} value={opt}>
            {opt || '— Select —'}
          </option>
        ))}
      </select>
      {error && <p className="text-sm text-red-600 mt-1">{error}</p>}
    </label>
  );
}