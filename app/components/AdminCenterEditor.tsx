// app/components/AdminCenterEditor.tsx
'use client';

import { MaterialReactTable, type MRT_ColumnDef } from 'material-react-table';
import { useMemo, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import ConfirmModal from './ConfirmModal';
import EditModal from './EditModal';

// Tarjeta resumen
function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-white shadow rounded-lg p-4 text-center">
      <div className="text-2xl font-bold text-inodia-blue">{value}</div>
      <div className="text-sm text-gray-600 mt-1">{label}</div>
    </div>
  );
}

type Center = {
  id: number;
  name: string;
  address: string;
  city: string;
  country: string;
  zip_code: string;
  contact_name_1: string;
  email_1: string;
  phone_1: string;
  contact_name_2: string;
  email_2: string;
  phone_2: string;
  contact_name_3: string;
  email_3: string;
  phone_3: string;
};

export default function AdminCenterEditor() {
  const [data, setData] = useState<Center[]>([]);
  const [loading, setLoading] = useState(true);
  const [centerToDelete, setCenterToDelete] = useState<Center | null>(null);
  const [centerToEdit, setCenterToEdit] = useState<Center | null>(null);
  const router = useRouter();

  useEffect(() => {
    async function fetchData() {
      try {
        // ✅ Mini‑mejora 1: evitar caché
        const res = await fetch('/api/sites/list', { cache: 'no-store' });
        const result = await res.json();
        setData(result.centers || result);
      } catch (err) {
        toast.error('❌ Failed to load centers');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const handleUpdateCenter = (updated: Center) => {
    setData((prev) => prev.map((c) => (c.id === updated.id ? { ...c, ...updated } : c)));
  };

  const confirmDelete = async () => {
    if (!centerToDelete) return;
    try {
      const res = await fetch(`/api/sites/admin/delete/${centerToDelete.id}`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error('Delete failed');

      toast.success(`🗑️ Deleted: ${centerToDelete.name}`);
      setData((prev) => prev.filter((c) => c.id !== centerToDelete.id));
    } catch (err) {
      toast.error('❌ Error deleting center');
    } finally {
      setCenterToDelete(null);
    }
  };

  const columns = useMemo<MRT_ColumnDef<Center>[]>(
    () => [
      { accessorKey: 'name', header: 'Center Name' },
      { accessorKey: 'address', header: 'Address' },
      { accessorKey: 'city', header: 'City' },
      { accessorKey: 'country', header: 'Country' },
      { accessorKey: 'zip_code', header: 'ZIP' },
      { accessorKey: 'contact_name_1', header: 'Primary Contact' },
      { accessorKey: 'email_1', header: 'Primary Email' },
      { accessorKey: 'phone_1', header: 'Primary Phone' },
      { accessorKey: 'contact_name_2', header: 'Secondary Contact' },
      { accessorKey: 'email_2', header: 'Secondary Email' },
      { accessorKey: 'phone_2', header: 'Secondary Phone' },
      { accessorKey: 'contact_name_3', header: 'Third Contact' },
      { accessorKey: 'email_3', header: 'Third Email' },
      { accessorKey: 'phone_3', header: 'Third Phone' },
    ],
    []
  );

  const totalCenters = data.length;
  const uniqueCountries = [...new Set(data.map((d) => d.country))].length;
  const totalContacts = data.reduce(
    (acc, c) => acc + [c.contact_name_1, c.contact_name_2, c.contact_name_3].filter(Boolean).length,
    0
  );

  return (
    <div className="px-4 py-8 bg-gray-100 min-h-screen">
      <div className="max-w-7xl mx-auto bg-white rounded-2xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <img src="/innodia_cristal.png" alt="INNODIA Logo" className="w-10 h-10" />
            <h1 className="text-2xl font-bold text-inodia-blue">Admin Clinical Centers Editor</h1>
          </div>
          <button
            onClick={() => router.push('/sites/create')}
            className="px-4 py-2 bg-inodia-blue text-white rounded-md hover:bg-blue-700"
          >
            Register New Center
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <StatCard label="Total Centers" value={totalCenters} />
          <StatCard label="Countries" value={uniqueCountries} />
          <StatCard label="Total Contacts" value={totalContacts} />
        </div>

        <p className="text-gray-600 mb-4">
          You can edit or delete centers. Changes will be saved directly to the database.
        </p>

        <MaterialReactTable
          columns={columns}
          data={data}
          state={{ isLoading: loading }}
          // ✅ Mini‑mejora 2: acciones por fila (Editar/Borrar)
          enableRowActions
          renderRowActions={({ row }) => (
            <div className="flex gap-2">
              <button
                onClick={() => setCenterToEdit(row.original)}
                className="px-2 py-1 text-sm bg-inodia-blue text-white rounded hover:bg-blue-700"
              >
                Edit
              </button>
              <button
                onClick={() => setCenterToDelete(row.original)}
                className="px-2 py-1 text-sm bg-gray-200 rounded hover:bg-gray-300"
              >
                Delete
              </button>
            </div>
          )}
          // Ajustes de tabla (opcionales)
          enableEditing
          editingMode="modal"
          enableDensityToggle={false}
          enablePagination
          enablePageSizeOptions
          paginationDisplayMode="pages"
          initialState={{ pagination: { pageSize: 10, pageIndex: 0 } }}
          muiTableContainerProps={{
            className: 'rounded-lg border border-gray-200',
          }}
          muiTablePaperProps={{
            elevation: 0,
            className: 'shadow-none',
          }}
          muiToolbarAlertBannerProps={{
            className: 'bg-inodia-blue text-white text-sm',
          }}
          muiTableHeadCellProps={{
            className: 'bg-gray-100 font-semibold text-sm text-gray-700',
          }}
          muiTableBodyCellProps={{
            className: 'text-sm',
          }}
        />

        <ConfirmModal
          isOpen={!!centerToDelete}
          title="Confirm Deletion"
          message="Are you sure you want to delete"
          highlight={centerToDelete?.name}
          onCancel={() => setCenterToDelete(null)}
          onConfirm={confirmDelete}
        />

        <EditModal
          isOpen={!!centerToEdit}
          center={centerToEdit}
          onClose={() => setCenterToEdit(null)}
          onSave={handleUpdateCenter}
        />
      </div>
    </div>
  );
}