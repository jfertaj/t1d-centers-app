// app/sites/success/page.tsx

'use client';

import { useSearchParams } from 'next/navigation';

export default function SuccessPage() {
  const searchParams = useSearchParams();
  const centerName = searchParams.get('name');

  return (
    <div className="container-box">
      <div className="logo-container">
        <img src="/innodia_cristal.png" alt="INNODIA Logo" className="logo-image" />
        <h1 className="title">Center Registered Successfully</h1>
      </div>

      <p className="subtitle">
        Thank you! The clinical center
        {centerName && (
          <span className="text-inodia-blue font-semibold"> “{centerName}” </span>
        )}
         has been saved in the database.
      </p>

      <hr className="separator" />

      <div className="flex flex-col sm:flex-row gap-4 justify-center mt-6">
        <a href="/sites/create" className="cta">Register another center</a>
        <a href="/sites/list" className="cta-secondary">View all centers</a>
      </div>
    </div>
  );
}