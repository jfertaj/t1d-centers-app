'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import toast from 'react-hot-toast';

type Form = {
  name: string;
  address: string;
  city: string;
  country: string;
  zip_code: string;
  type_of_ed: 'High Risk' | 'General Population' | '';
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

  const [submitting, setSubmitting] = useState(false);

  const set = (k: keyof Form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value as any }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    // Validaciones
    const errs: string[] = [];
    if (!form.name.trim()) errs.push('Center name is required.');
    if (!form.address.trim()) errs.push('Address is required.');
    if (!form.country.trim()) errs.push('Country is required.');
    if (!form.zip_code.trim()) errs.push('ZIP code is required.');

    // Al menos un contacto con Name + Email
    const hasOneFullContact =
      (form.contact_name_1 && form.email_1) ||
      (form.contact_name_2 && form.email_2) ||
      (form.contact_name_3 && form.email_3) ||
      (form.contact_name_4 && form.email_4) ||
      (form.contact_name_5 && form.email_5) ||
      (form.contact_name_6 && form.email_6);

    if (!hasOneFullContact) {
      errs.push('Provide at least one contact with Name and Email.');
    }

    if (errs.length) {
      toast.error(errs[0]);
      return;
    }

    setSubmitting(true);
    try {
      // Limpia strings vacíos → null (para no forzar columnas)
      const payload: Record<string, any> = { ...form };
      Object.keys(payload).forEach((k) => {
        if (payload[k] === '') payload[k] = null;
      });

      const res = await fetch('/api/sites/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const t = await res.text().catch(() => '');
        throw new Error(t || 'Create failed');
      }

      toast.success(`✅ Center "${form.name}" registered`);
      router.push('/admin'); // vuelve al listado
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
              <Input label="Center Name *" value={form.name} onChange={set('name')} />
              <Select
                label="Type of ED"
                value={form.type_of_ed}
                onChange={set('type_of_ed')}
                options={['', 'High Risk', 'General Population']}
              />
              <Input label="Detect Site" value={form.detect_site} onChange={set('detect_site')} />
              <Input label="City" value={form.city} onChange={set('city')} />
              <Input label="Address *" className="md:col-span-2" value={form.address} onChange={set('address')} />
              <Select
                label="Country *"
                value={form.country}
                onChange={set('country')}
                options={['', ...EU_COUNTRIES]}
              />
              <Input label="ZIP Code *" value={form.zip_code} onChange={set('zip_code')} />
            </div>
          </fieldset>

          {/* Contacts 1–6 */}
          {Array.from({ length: 6 }, (_, i) => i + 1).map((n) => (
            <fieldset key={n} className="border border-gray-200 rounded-lg p-4">
              <legend className="px-2 text-sm font-semibold text-gray-700">
                {n === 1 ? 'Primary' : `Contact ${n}`} {n === 1 ? '(at least Name + Email)' : '(optional)'}
              </legend>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input label="Name" value={(form as any)[`contact_name_${n}`] ?? ''} onChange={set(`contact_name_${n}` as any)} />
                <Input label="Email" type="email" value={(form as any)[`email_${n}`] ?? ''} onChange={set(`email_${n}` as any)} />
                <Input label="Phone" value={(form as any)[`phone_${n}`] ?? ''} onChange={set(`phone_${n}` as any)} />
              </div>
            </fieldset>
          ))}

          <div className="flex justify-between">
            <button type="button" onClick={() => router.push('/admin')} className="px-4 py-2 rounded-md border">
              ← Back to list
            </button>
            <div className="flex gap-3">
              <button type="button" onClick={reset} className="px-4 py-2 rounded-md border">
                Reset
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 bg-inodia-blue text-white rounded-md disabled:opacity-60"
              >
                {submitting ? 'Saving…' : 'Register'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

function Input(
  props: React.InputHTMLAttributes<HTMLInputElement> & { label: string; className?: string }
) {
  const { label, className, ...rest } = props;
  return (
    <label className={`block ${className ?? ''}`}>
      <span className="block text-sm text-gray-700 mb-1">{label}</span>
      <input
        {...rest}
        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
      />
    </label>
  );
}

function Select({
  label, options, className, ...rest
}: React.SelectHTMLAttributes<HTMLSelectElement> & { label: string; options: (string)[] }) {
  return (
    <label className={`block ${className ?? ''}`}>
      <span className="block text-sm text-gray-700 mb-1">{label}</span>
      <select
        {...rest}
        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-200"
      >
        {options.map((opt) => (
          <option key={opt || 'empty'} value={opt}>
            {opt || '— Select —'}
          </option>
        ))}
      </select>
    </label>
  );
}