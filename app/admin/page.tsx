'use client';

import dynamic from 'next/dynamic';
import withAdmin from '@/components/withAdmin';

// Importa solo de forma dinámica — sin SSR para MaterialReactTable
const AdminCenterEditor = dynamic(() => import('@/components/AdminCenterEditor'), {
  ssr: false,
});

function AdminPage() {
  return <AdminCenterEditor />;
}

export default withAdmin(AdminPage);