// app/sites/error/page.tsx

'use client';

import { useSearchParams } from 'next/navigation';

export default function ErrorPage() {
  const searchParams = useSearchParams();
  const message = searchParams.get('message') || 'An unexpected error occurred. Please try again.';

  return (
    <div className="container-box">
      <div className="logo-container">
        <img src="/innodia_cristal.png" alt="INNODIA Logo" className="logo-image" />
        <h1 className="title text-red-600">Error Saving Center</h1>
      </div>
      <p className="subtitle text-red-700">{decodeURIComponent(message)}</p>
      <hr className="separator" />
      <div className="flex flex-col md:flex-row gap-4 justify-center mt-4">
        <a href="/sites/create" className="cta">← Try again</a>
        <a href="/sites/list" className="cta-alt">View submitted centers</a>
      </div>
    </div>
  );
}