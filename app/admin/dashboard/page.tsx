'use client';

import { useEffect, useState } from 'react';

type Stats = {
  totalCenters: number;
  countriesCount: number;
  centersWithCoordinates: number;
};

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      setLoading(true);
      try {
        const res = await fetch('/api/admin/stats');
        const data = await res.json();
        setStats(data);
      } catch (err) {
        console.error('❌ Failed to fetch admin stats:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, []);

  return (
    <div className="container-box-wide mt-6">
      <div className="flex items-center mb-6 gap-4">
        <img src="/innodia_cristal.png" alt="INNODIA Logo" className="w-10 h-10" />
        <h1 className="text-2xl font-bold text-inodia-blue">Admin Dashboard</h1>
      </div>

      {loading ? (
        <p className="text-gray-600">Loading statistics...</p>
      ) : stats ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-xl shadow border">
            <h2 className="text-sm text-gray-500">Total Registered Centers</h2>
            <p className="text-3xl font-bold text-inodia-blue mt-2">{stats.totalCenters}</p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow border">
            <h2 className="text-sm text-gray-500">Countries Represented</h2>
            <p className="text-3xl font-bold text-inodia-blue mt-2">{stats.countriesCount}</p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow border">
            <h2 className="text-sm text-gray-500">Centers Geocoded</h2>
            <p className="text-3xl font-bold text-inodia-blue mt-2">{stats.centersWithCoordinates}</p>
          </div>
        </div>
      ) : (
        <p className="text-red-600">Could not load dashboard stats.</p>
      )}
    </div>
  );
}