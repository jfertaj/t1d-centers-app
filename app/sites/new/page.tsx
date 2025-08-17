'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function NewSitePage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: '',
    address: '',
    city: '',
    country: '',
    zip_code: '',
    contact_name_1: '',
    email_1: '',
    phone_1: '',
    contact_name_2: '',
    email_2: '',
    phone_2: '',
    contact_name_3: '',
    email_3: '',
    phone_3: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessMessage('');

    const res = await fetch('/api/sites/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });

    const data = await res.json();
    setLoading(false);

    if (res.ok) {
      setSuccessMessage('Center successfully created! Redirecting...');
      setTimeout(() => router.push('/sites/list'), 3000); // ⏳ Redirige en 3 segundos
    } else {
      setError(data.error || 'Failed to create center');
    }
  };

  return (
    <div className="container-box-wide">
      <div className="logo-container mb-6">
        <img src="/logo_innodia.png" alt="INNODIA Logo" className="logo-image" />
        <h1 className="title">Add New Clinical Center</h1>
      </div>

      {successMessage && <div className="banner-success">{successMessage}</div>}
      {error && <div className="banner-error">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="form-label">Center Name</label>
            <input className="form-input" name="name" value={form.name} onChange={handleChange} required />
          </div>
          <div>
            <label className="form-label">Street Address</label>
            <input className="form-input" name="address" value={form.address} onChange={handleChange} required />
          </div>
          <div>
            <label className="form-label">City</label>
            <input className="form-input" name="city" value={form.city} onChange={handleChange} required />
          </div>
          <div>
            <label className="form-label">ZIP Code</label>
            <input className="form-input" name="zip_code" value={form.zip_code} onChange={handleChange} required />
          </div>
          <div>
            <label className="form-label">Country</label>
            <input className="form-input" name="country" value={form.country} onChange={handleChange} required />
          </div>
        </div>

        <hr className="separator" />

        <h2 className="section-title">Primary Contact</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <input className="form-input" name="contact_name_1" placeholder="Name" value={form.contact_name_1} onChange={handleChange} required disabled={loading} />
          <input className="form-input" name="email_1" placeholder="Email" value={form.email_1} onChange={handleChange} required disabled={loading} />
          <input className="form-input" name="phone_1" placeholder="Phone" value={form.phone_1} onChange={handleChange} required disabled={loading} />
        </div>

        <h2 className="section-title">Secondary Contact</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <input className="form-input" name="contact_name_2" placeholder="Name" value={form.contact_name_2} onChange={handleChange} required disabled={loading} />
          <input className="form-input" name="email_2" placeholder="Email" value={form.email_2} onChange={handleChange} required disabled={loading} />
          <input className="form-input" name="phone_2" placeholder="Phone" value={form.phone_2} onChange={handleChange} required disabled={loading} />
        </div>

        <h2 className="section-title">Tertiary Contact</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <input className="form-input" name="contact_name_3" placeholder="Name" value={form.contact_name_3} onChange={handleChange} required disabled={loading} />
          <input className="form-input" name="email_3" placeholder="Email" value={form.email_3} onChange={handleChange} required disabled={loading} />
          <input className="form-input" name="phone_3" placeholder="Phone" value={form.phone_3} onChange={handleChange} required disabled={loading} />
        </div>

        <div className="flex justify-end">
          <button type="submit" className="button-blue" disabled={loading}>
            {loading ? 'Saving...' : 'Save Center'}
          </button>
        </div>
      </form>
    </div>
  );
}