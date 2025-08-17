'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import toast from 'react-hot-toast';

export default function RegisterForm() {
  const router = useRouter();

  const [formData, setFormData] = useState({
    centerName: '',
    address: '',
    city: '',
    country: '',
    zipCode: '',
    primaryName: '',
    primaryEmail: '',
    primaryPhone: '',
    secondaryName: '',
    secondaryEmail: '',
    secondaryPhone: '',
    thirdName: '',
    thirdEmail: '',
    thirdPhone: '',
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [contactWarning, setContactWarning] = useState(false);
  const [loading, setLoading] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setErrors(prev => ({ ...prev, [name]: '' }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);

    const newErrors: { [key: string]: string } = {};
    const requiredFields = ['centerName', 'address', 'city', 'country', 'zipCode'];
    requiredFields.forEach(field => {
      if (!formData[field as keyof typeof formData]) {
        newErrors[field] = 'This field is required';
      }
    });

    const hasAnyContact =
      formData.primaryName || formData.primaryEmail || formData.primaryPhone ||
      formData.secondaryName || formData.secondaryEmail || formData.secondaryPhone ||
      formData.thirdName || formData.thirdEmail || formData.thirdPhone;

    setErrors(newErrors);
    setContactWarning(!hasAnyContact);

    if (Object.keys(newErrors).length > 0 || !hasAnyContact) {
      toast.error('❌ Please fill in all required fields and at least one contact.');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/sites/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.centerName,
          address: formData.address,
          city: formData.city,
          country: formData.country,
          zip_code: formData.zipCode,
          contact_name_1: formData.primaryName,
          email_1: formData.primaryEmail,
          phone_1: formData.primaryPhone,
          contact_name_2: formData.secondaryName,
          email_2: formData.secondaryEmail,
          phone_2: formData.secondaryPhone,
          contact_name_3: formData.thirdName,
          email_3: formData.thirdEmail,
          phone_3: formData.thirdPhone,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ Backend error:', errorData);

        if (errorData?.details?.includes('geocode')) {
          toast.error('⚠️ Could not geocode the address. Please check it and try again.');
        } else {
          toast.error(`❌ Error: ${errorData.error || 'Unable to save the center'}`);
        }

        setLoading(false);
        return;
      }

      const result = await response.json();
      toast.success(`✅ Center "${formData.centerName}" registered successfully`);
      router.push(`/sites/success?center=${encodeURIComponent(formData.centerName)}`);
    } catch (err) {
      console.error('❌ Network error:', err);
      toast.error('❌ Failed to submit. Please try again later.');
      setLoading(false);
    }
  }

  function handleReset() {
    setFormData({
      centerName: '',
      address: '',
      city: '',
      country: '',
      zipCode: '',
      primaryName: '',
      primaryEmail: '',
      primaryPhone: '',
      secondaryName: '',
      secondaryEmail: '',
      secondaryPhone: '',
      thirdName: '',
      thirdEmail: '',
      thirdPhone: '',
    });
    setErrors({});
    setContactWarning(false);
  }

  function handleBack() {
    router.push('/sites/list');
  }

  return (
    <div className="px-4 py-10 bg-gray-100">
      <div className="max-w-5xl mx-auto bg-white rounded-2xl shadow-lg p-8 mt-6">
        <div className="flex items-center space-x-4 mb-6">
          <img src="/innodia_cristal.png" alt="INNODIA Logo" className="w-12 h-12" />
          <h1 className="text-2xl font-bold text-inodia-blue">Register a New Clinical Center</h1>
        </div>
        <p className="text-gray-600 mb-6">
          Please fill in the form below to register a clinical site in the system.
        </p>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Campos generales */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              { label: 'Center Name', name: 'centerName' },
              { label: 'Address', name: 'address' },
              { label: 'City', name: 'city' },
              { label: 'Country', name: 'country' },
              { label: 'ZIP Code', name: 'zipCode' },
            ].map(({ label, name }) => (
              <div key={name}>
                <label className="block text-sm font-medium text-gray-700">
                  {label} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name={name}
                  value={formData[name as keyof typeof formData]}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-md p-2 mt-1"
                />
                {errors[name] && (
                  <p className="text-sm text-red-600 mt-1">{errors[name]}</p>
                )}
              </div>
            ))}
          </div>

          <hr className="my-6" />

          {/* Contactos */}
          {['Primary', 'Secondary', 'Third'].map((label, i) => {
            const prefix = ['primary', 'secondary', 'third'][i];
            return (
              <div key={prefix}>
                <h2 className="text-md font-bold text-inodia-blue mb-2">{label} Contact</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <input type="text" name={`${prefix}Name`} placeholder="Name" value={formData[`${prefix}Name` as keyof typeof formData]} onChange={handleChange} className="w-full border border-gray-300 rounded-md p-2" />
                  <input type="email" name={`${prefix}Email`} placeholder="Email" value={formData[`${prefix}Email` as keyof typeof formData]} onChange={handleChange} className="w-full border border-gray-300 rounded-md p-2" />
                  <input type="text" name={`${prefix}Phone`} placeholder="Phone" value={formData[`${prefix}Phone` as keyof typeof formData]} onChange={handleChange} className="w-full border border-gray-300 rounded-md p-2" />
                </div>
              </div>
            );
          })}

          {contactWarning && (
            <p className="text-sm text-yellow-600 mt-2">
              ⚠️ You have not added any contact information. Please add at least one contact or continue anyway.
            </p>
          )}

          {/* Botones */}
          <div className="flex justify-between mt-6">
            <div className="flex gap-4">
              <button
                type="button"
                onClick={handleBack}
                className="px-4 py-2 rounded-md border text-gray-700 bg-white hover:bg-gray-100"
              >
                ← Sites List
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="px-4 py-2 rounded-md border text-gray-700 bg-white hover:bg-gray-100"
              >
                Reset form
              </button>
            </div>
            <button
              type="submit"
              className="button-blue flex items-center justify-center min-w-[120px]"
            >
              {loading ? (
                <svg
                  className="animate-spin h-5 w-5 text-white"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="white"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="white"
                    d="M4 12a8 8 0 018-8v8H4z"
                  />
                </svg>
              ) : (
                'Register'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}