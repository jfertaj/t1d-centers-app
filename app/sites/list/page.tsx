// app/sites/list/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface ClinicalCenter {
  id: number;
  name: string;
  city: string;
  country: string;
  zip_code: string;
  latitude: number | null;
  longitude: number | null;
}

export default function SitesListPage() {
  const [centers, setCenters] = useState<ClinicalCenter[]>([]);
  const [loading, setLoading] = useState(true);
  const [showButton, setShowButton] = useState(false);
  const router = useRouter();

  useEffect(() => {
    async function fetchCenters() {
      try {
        // evita caché para no traer una forma distinta del payload al volver
        const res = await fetch('/api/sites/list', { cache: 'no-store' });
        const data = await res.json();

        // Normaliza: acepta tanto [{...}] como { centers: [{...}] }
        const normalized: unknown = Array.isArray(data) ? data : data?.centers;
        setCenters(Array.isArray(normalized) ? (normalized as ClinicalCenter[]) : []);
      } catch (error) {
        console.error('❌ Failed to fetch centers:', error);
        setCenters([]); // garantiza array para el render
      } finally {
        setLoading(false);
      }
    }

    fetchCenters();
  }, []);

  // Mostrar botón si el scroll pasa los 300px
  useEffect(() => {
    const handleScroll = () => setShowButton(window.scrollY > 300);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleNewSite = () => router.push('/sites/create');

  const fmt = (n: number | null | undefined) =>
    typeof n === 'number' ? n.toFixed(4) : '';

  return (
    <div className="container-box-wide pb-24">
      <div className="logo-container mb-4">
        <img src="/innodia_cristal.png" alt="INNODIA Logo" className="logo-image" />
        <h1 className="title">Registered Clinical Centers</h1>
      </div>

      <div className="flex justify-between items-center mb-4">
        <p className="text-gray-600">
          {loading ? 'Loading…' : `A total of ${centers.length} centers registered.`}
        </p>
        <button
          onClick={handleNewSite}
          className="px-4 py-2 rounded-md bg-inodia-blue text-white hover:bg-blue-700 transition text-sm"
        >
          ➕ Register New Site
        </button>
      </div>

      {loading ? (
        <p className="mt-6 text-gray-600">Loading...</p>
      ) : centers.length === 0 ? (
        <div className="mt-6 text-gray-600">
          No centers found.
        </div>
      ) : (
        <table className="min-w-full border mt-2 text-sm text-left">
          <thead className="bg-inodia-blue text-white">
            <tr>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">City</th>
              <th className="px-4 py-2">Country</th>
              <th className="px-4 py-2">ZIP</th>
              <th className="px-4 py-2">Lat</th>
              <th className="px-4 py-2">Lng</th>
            </tr>
          </thead>
          <tbody>
            {centers.map((center) => (
              <tr key={center.id} className="border-b hover:bg-gray-100">
                <td className="px-4 py-2">{center.name}</td>
                <td className="px-4 py-2">{center.city}</td>
                <td className="px-4 py-2">{center.country}</td>
                <td className="px-4 py-2">{center.zip_code}</td>
                <td className="px-4 py-2">{fmt(center.latitude)}</td>
                <td className="px-4 py-2">{fmt(center.longitude)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Botón flotante con transición */}
      <div
        className={`fixed bottom-4 right-4 z-50 transition-opacity duration-500 ${
          showButton ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <button
          onClick={handleNewSite}
          className="px-5 py-3 bg-inodia-blue text-white text-sm rounded-xl shadow-lg hover:bg-blue-700 transition"
        >
          ➕ Register New Site
        </button>
      </div>
    </div>
  );
}