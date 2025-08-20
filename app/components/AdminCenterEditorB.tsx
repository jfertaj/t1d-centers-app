'use client';

import {
  MaterialReactTable,
  type MRT_ColumnDef,
  type MRT_Row,
  type MRT_TableInstance,
} from 'material-react-table';
import { useMemo, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import ConfirmModal from './ConfirmModal';

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
  type_of_ed: string | null;
  detect_site: string | null;

  contact_name_1: string | null; email_1: string | null; phone_1: string | null;
  contact_name_2: string | null; email_2: string | null; phone_2: string | null;
  contact_name_3: string | null; email_3: string | null; phone_3: string | null;
  contact_name_4: string | null; email_4: string | null; phone_4: string | null;
  contact_name_5: string | null; email_5: string | null; phone_5: string | null;
  contact_name_6: string | null; email_6: string | null; phone_6: string | null;

  latitude: number | null;
  longitude: number | null;
};

export default function AdminCenterEditor() {
  const [data, setData] = useState<Center[]>([]);
  const [loading, setLoading] = useState(true);
  const [centerToDelete, setCenterToDelete] = useState<Center | null>(null);
  const router = useRouter();

  useEffect(() => {
    (async () => {
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
    })();
  }, []);

  const handleSaveRow = async ({
    exitEditingMode,
    row,
    values,
  }: {
    exitEditingMode: () => void;
    row: MRT_Row<Center>;
    values: Partial<Center>;
  }) => {
    try {
      // limpiamos undefined para no enviar claves “vacías”
      const payload: Record<string, unknown> = { ...values };
      Object.keys(payload).forEach((k) => {
        // @ts-ignore
        if (payload[k] === undefined) delete payload[k];
      });

      const res = await fetch(`/api/sites/admin/update/${row.original.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text());

      toast.success(`✅ Updated: ${values.name ?? row.original.name}`);
      setData((prev) =>
        prev.map((c) => (c.id === row.original.id ? { ...c, ...values } as Center : c)),
      );
      exitEditingMode();
    } catch (e) {
      console.error(e);
      toast.error('❌ Error updating center');
    }
  };

  const confirmDelete = async () => {
    if (!centerToDelete) return;
    try {
      const res = await fetch(`/api/sites/admin/delete/${centerToDelete.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success(`🗑️ Deleted: ${centerToDelete.name}`);
      setData((prev) => prev.filter((c) => c.id !== centerToDelete.id));
    } catch {
      toast.error('❌ Error deleting center');
    } finally {
      setCenterToDelete(null);
    }
  };

  const columns = useMemo<MRT_ColumnDef<Center>[]>(() => [
    // Core visibles
    { accessorKey: 'name', header: 'Center Name' },
    { accessorKey: 'address', header: 'Address' },
    { accessorKey: 'city', header: 'City' },
    { accessorKey: 'country', header: 'Country', size: 60 },
    { accessorKey: 'zip_code', header: 'ZIP', size: 80 },

    // Campos extra (visibles)
    { accessorKey: 'type_of_ed', header: 'Type of ED' },
    { accessorKey: 'detect_site', header: 'Detect Site' },

    // Contacto principal
    { accessorKey: 'contact_name_1', header: 'Primary Contact' },
    { accessorKey: 'email_1', header: 'Primary Email' },
    { accessorKey: 'phone_1', header: 'Primary Phone' },

    // Resto de contactos (ocultos por defecto — se pueden activar en el menú de columnas)
    { accessorKey: 'contact_name_2', header: 'Contact 2', enableHiding: true },
    { accessorKey: 'email_2', header: 'Email 2', enableHiding: true },
    { accessorKey: 'phone_2', header: 'Phone 2', enableHiding: true },

    { accessorKey: 'contact_name_3', header: 'Contact 3', enableHiding: true },
    { accessorKey: 'email_3', header: 'Email 3', enableHiding: true },
    { accessorKey: 'phone_3', header: 'Phone 3', enableHiding: true },

    { accessorKey: 'contact_name_4', header: 'Contact 4', enableHiding: true },
    { accessorKey: 'email_4', header: 'Email 4', enableHiding: true },
    { accessorKey: 'phone_4', header: 'Phone 4', enableHiding: true },

    { accessorKey: 'contact_name_5', header: 'Contact 5', enableHiding: true },
    { accessorKey: 'email_5', header: 'Email 5', enableHiding: true },
    { accessorKey: 'phone_5', header: 'Phone 5', enableHiding: true },

    { accessorKey: 'contact_name_6', header: 'Contact 6', enableHiding: true },
    { accessorKey: 'email_6', header: 'Email 6', enableHiding: true },
    { accessorKey: 'phone_6', header: 'Phone 6', enableHiding: true },

    // Coordenadas (ocultas de inicio)
    { accessorKey: 'latitude', header: 'Lat', enableHiding: true },
    { accessorKey: 'longitude', header: 'Lng', enableHiding: true },
  ], []);

  return (
    <div className="px-4 py-8 bg-gray-100 min-h-screen">
      <div className="max-w-7xl mx-auto bg-white rounded-2xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <img src="/innodia_cristal.png" alt="INNODIA Logo" className="w-10 h-10" />
            <h1 className="text-2xl font-bold text-inodia-blue">
              Admin Clinical Centers Editor
            </h1>
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

        <MaterialReactTable
          columns={columns}
          data={data}
          state={{ isLoading: loading }}
          enableColumnOrdering
          enableColumnFilters
          enableDensityToggle
          enableFullScreenToggle
          enableHiding
          enableRowActions
          renderRowActions={({ row, table }: { row: MRT_Row<Center>; table: MRT_TableInstance<Center> }) => (
            <div className="flex gap-2">
              <button
                onClick={() => table.setEditingRow(row)} // abre modal de edición
                className="px-2 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
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
          enableEditing
          editDisplayMode="modal"
          onEditingRowSave={handleSaveRow}
          initialState={{
            pagination: { pageSize: 10, pageIndex: 0 },
            columnVisibility: {
              // ocultamos de inicio columnas verbosas; el usuario puede activarlas
              contact_name_2: false, email_2: false, phone_2: false,
              contact_name_3: false, email_3: false, phone_3: false,
              contact_name_4: false, email_4: false, phone_4: false,
              contact_name_5: false, email_5: false, phone_5: false,
              contact_name_6: false, email_6: false, phone_6: false,
              latitude: false, longitude: false,
            },
          }}
          muiTableContainerProps={{ className: 'rounded-lg border border-gray-200' }}
          muiTableHeadCellProps={{ className: 'bg-gray-100 font-semibold text-sm text-gray-700' }}
          muiTableBodyCellProps={{ className: 'text-sm' }}
          paginationDisplayMode="pages"
          muiPaginationProps={{
            rowsPerPageOptions: [5, 10, 20, 50],
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