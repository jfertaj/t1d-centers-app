// app/components/AdminCenterEditor.tsx
'use client';

import {
  MaterialReactTable,
  type MRT_ColumnDef,
  type MRT_Row,
} from 'material-react-table';
import { useMemo, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import ConfirmModal from './ConfirmModal';

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
  const router = useRouter();

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/api/sites/list', { cache: 'no-store' });
        if (!res.ok) throw new Error('Failed fetching centers');
        const result = await res.json();
        setData(result.centers || result);
      } catch {
        toast.error('❌ Failed to load centers');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const handleSaveRow = async ({ exitEditingMode, row, values }: {
    exitEditingMode: () => void;
    row: MRT_Row<Center>;
    values: Center;
  }) => {
    try {
      const res = await fetch(`/api/sites/admin/update/${row.original.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      if (!res.ok) throw new Error('Update failed');

      toast.success(`✅ Updated: ${values.name}`);
      setData(prev =>
        prev.map(c => (c.id === row.original.id ? { ...c, ...values } : c))
      );
      exitEditingMode(); // cierra el modal
    } catch {
      toast.error('❌ Error updating center');
    }
  };

  const confirmDelete = async () => {
    if (!centerToDelete) return;
    try {
      const res = await fetch(`/api/sites/admin/delete/${centerToDelete.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Delete failed');
      toast.success(`🗑️ Deleted: ${centerToDelete.name}`);
      setData(prev => prev.filter(c => c.id !== centerToDelete.id));
    } catch {
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

        <MaterialReactTable
          columns={columns}
          data={data}
          state={{ isLoading: loading }}
          enableRowActions
          renderRowActions={({ row }) => (
            <div className="flex gap-2">
              <button
                onClick={() => setCenterToDelete(row.original)}
                className="px-2 py-1 text-sm bg-gray-200 rounded hover:bg-gray-300"
              >
                Delete
              </button>
            </div>
          )}
          enableEditing
          editDisplayMode="modal"
          onEditingRowSave={handleSaveRow}
          muiTableContainerProps={{ className: 'rounded-lg border border-gray-200' }}
          muiTableHeadCellProps={{ className: 'bg-gray-100 font-semibold text-sm text-gray-700' }}
          muiTableBodyCellProps={{ className: 'text-sm' }}
          enablePagination
          paginationDisplayMode="pages"
          initialState={{ 
            pagination: { pageSize: 10, pageIndex: 0 } 
          }}
          muiPaginationProps={{
            rowsPerPageOptions: [5, 10, 20, 50], // aquí controlas el selector de tamaño
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
      </div>
    </div>
  );
}