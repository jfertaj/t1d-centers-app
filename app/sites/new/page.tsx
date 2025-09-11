'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type FormState = {
  name: string;
  address: string;
  city: string;
  country: string;
  zip_code: string;

  age_from: string;
  age_to: string;
  monitor: 'yes' | 'no' | 'any';

  contact_name_1: string; email_1: string; phone_1: string;
  contact_name_2: string; email_2: string; phone_2: string;
  contact_name_3: string; email_3: string; phone_3: string;
  contact_name_4: string; email_4: string; phone_4: string;
  contact_name_5: string; email_5: string; phone_5: string;
  contact_name_6: string; email_6: string; phone_6: string;
};

export default function NewSitePage() {
  const router = useRouter();

  const [form, setForm] = useState<FormState>({
    name: '',
    address: '',
    city: '',
    country: '',
    zip_code: '',
    age_from: '',
    age_to: '',
    monitor: '',

    contact_name_1: '', email_1: '', phone_1: '',
    contact_name_2: '', email_2: '', phone_2: '',
    contact_name_3: '', email_3: '', phone_3: '',
    contact_name_4: '', email_4: '', phone_4: '',
    contact_name_5: '', email_5: '', phone_5: '',
    contact_name_6: '', email_6: '', phone_6: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setForm((s) => ({ ...s, [name]: value }));
  };

  const toIntOrNull = (s: string): number | null =>
    s === '' ? null : Number.isFinite(Number(s)) ? Number(s) : null;

  const mapMonitor = (v: FormState['monitor']): boolean | null =>
    v === 'no' ? null : v === 'yes';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessMessage('');

    const payload: any = {
      ...form,
      age_from: toIntOrNull(form.age_from),
      age_to: toIntOrNull(form.age_to),
      monitor: mapMonitor(form.monitor), // <- ✅ boolean | null
    };

    try {
      const res = await fetch('/api/sites/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to create center');

      setSuccessMessage('Center successfully created! Redirecting...');
      setTimeout(() => router.push('/sites/list'), 2000);
    } catch (err: any) {
      setError(err?.message || 'Failed to create center');
    } finally {
      setLoading(false);
    }
  };

  const renderContactFields = (n: number) => (
    <div key={n} className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <input
        className="form-input"
        name={`contact_name_${n}`}
        placeholder={`Contact ${n} Name`}
        value={form[`contact_name_${n}` as keyof FormState] as string}
        onChange={handleChange}
        disabled={loading}
      />
      <input
        className="form-input"
        name={`email_${n}`}
        placeholder={`Contact ${n} Email`}
        value={form[`email_${n}` as keyof FormState] as string}
        onChange={handleChange}
        disabled={loading}
        type="email"
      />
      <input
        className="form-input"
        name={`phone_${n}`}
        placeholder={`Contact ${n} Phone`}
        value={form[`phone_${n}` as keyof FormState] as string}
        onChange={handleChange}
        disabled={loading}
        type="tel"
        inputMode="tel"
      />
    </div>
  );

  return (
    <div className="container-box-wide">
      <div className="logo-container mb-6">
        <img src="/logo_innodia.png" alt="INNODIA Logo" className="logo-image" />
        <h1 className="title">Add New Clinical Center</h1>
      </div>

      {successMessage && <div className="banner-success">{successMessage}</div>}
      {error && <div className="banner-error">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Datos básicos */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            className="form-input"
            name="name"
            placeholder="Center Name"
            value={form.name}
            onChange={handleChange}
            required
            disabled={loading}
          />
          <input
            className="form-input"
            name="address"
            placeholder="Street Address"
            value={form.address}
            onChange={handleChange}
            required
            disabled={loading}
          />
          <input
            className="form-input"
            name="city"
            placeholder="City"
            value={form.city}
            onChange={handleChange}
            required
            disabled={loading}
          />
          <input
            className="form-input"
            name="zip_code"
            placeholder="ZIP Code"
            value={form.zip_code}
            onChange={handleChange}
            required
            disabled={loading}
          />
          <input
            className="form-input"
            name="country"
            placeholder="Country"
            value={form.country}
            onChange={handleChange}
            required
            disabled={loading}
          />
        </div>

        {/* Eligibilidad */}
        <hr className="separator" />
        <h2 className="section-title">Eligibility</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="form-label">Age From</label>
            <input
              className="form-input"
              type="number"
              min={0}
              name="age_from"
              value={form.age_from}
              onChange={handleChange}
              disabled={loading}
              placeholder="e.g., 2"
            />
          </div>
          <div>
            <label className="form-label">Age To</label>
            <input
              className="form-input"
              type="number"
              min={0}
              name="age_to"
              value={form.age_to}
              onChange={handleChange}
              disabled={loading}
              placeholder="e.g., 18"
            />
          </div>
          <div>
            <label className="form-label">Monitor</label>
            <select
              className="form-input"
              name="monitor"
              value={form.monitor}
              onChange={handleChange}
              disabled={loading}
            >
              <option value="any">Any</option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </div>
        </div>

        {/* Contactos */}
        <hr className="separator" />
        <h2 className="section-title">Contacts</h2>
        {Array.from({ length: 6 }, (_, i) => renderContactFields(i + 1))}

        <div className="flex justify-end">
          <button type="submit" className="button-blue" disabled={loading}>
            {loading ? 'Saving...' : 'Save Center'}
          </button>
        </div>
      </form>
    </div>
  );
}