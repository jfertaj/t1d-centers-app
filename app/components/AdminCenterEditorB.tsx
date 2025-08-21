// app/components/AdminCenterEditorB.tsx
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

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-white shadow rounded-lg p-4 text-center">
      <div className="text-2xl font-bold text-inodia-blue">{value}</div>
      <div className="text-sm text-gray-600 mt-1">{label}</div>
    </div>
  );
}

// --- Opciones de selects ---
const TYPE_OF_ED_OPTIONS = [
  { value: 'High Risk', label: 'High Risk' },
  { value: 'General Population', label: 'General Population' },
];

// Lista de países europeos (UE/EEE + UK)
const EU_COUNTRIES = [
  'Austria','Belgium','Bulgaria','Croatia','Cyprus','Czech Republic','Denmark',
  'Estonia','Finland','France','Germany','Greece','Hungary','Iceland','Ireland',
  'Italy','Latvia','Liechtenstein','Lithuania','Luxembourg','Malta','Netherlands',
  'Norway','Poland','Portugal','Romania','Slovakia','Slovenia','Spain','Sweden',
  'Switzerland','United Kingdom'
].map((c) => ({ value: c, label: c }));

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

export default function AdminCenterEditorB() {
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

  const stats = useMemo(() => {
    const totalCenters = data.length;
    const uniqueCountries = new Set(
      data.map((d) => d.country).filter(Boolean) as string[]
    ).size;
    const totalContacts = data.reduce((acc, c) => {
      const names = [
        c.contact_name_1, c.contact_name_2, c.contact_name_3,
        c.contact_name_4, c.contact_name_5, c.contact_name_6,
      ];
      return acc + names.filter(Boolean).length;
    }, 0);
    return { totalCenters, uniqueCountries, totalContacts };
  }, [data]);

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
      const payload: Record<string, unknown> = { ...values };
      delete payload.id;
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
        prev.map((c) => (c.id === row.original.id ? { ...c, ...values } as Center : c))
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

  // Columnas con selects en edición
  const columns = useMemo<MRT_ColumnDef<Center>[]>(() => [
    { accessorKey: 'name', header: 'Center Name',
      muiEditTextFieldProps: { required: true } },
    { accessorKey: 'address', header: 'Address',
      muiEditTextFieldProps: { required: true } },
    { accessorKey: 'city', header: 'City',
      muiEditTextFieldProps: { required: true } },

    {
      accessorKey: 'country',
      header: 'Country',
      size: 60,
      editVariant: 'select',
      editSelectOptions: EU_COUNTRIES,
      muiEditTextFieldProps: {
        select: true,
        required: true,
      },
    },
    { accessorKey: 'zip_code', header: 'ZIP', size: 80,
      muiEditTextFieldProps: { required: true } },

    {
      accessorKey: 'type_of_ed',
      header: 'Type of ED',
      editVariant: 'select',
      editSelectOptions: TYPE_OF_ED_OPTIONS,
      muiEditTextFieldProps: { select: true },
    },
    { accessorKey: 'detect_site', header: 'Detect Site' },

    // Contacto principal
    { accessorKey: 'contact_name_1', header: 'Primary Contact' },
    { accessorKey: 'email_1', header: 'Primary Email',
      muiEditTextFieldProps: { type: 'email' } },
    { accessorKey: 'phone_1', header: 'Primary Phone',
      muiEditTextFieldProps: { inputMode: 'tel' } },

    // Contactos 2..6 (ocultos de inicio, editables en modal)
    { accessorKey: 'contact_name_2', header: 'Contact 2', enableHiding: true },
    { accessorKey: 'email_2', header: 'Email 2', enableHiding: true,
      muiEditTextFieldProps: { type: 'email' } },
    { accessorKey: 'phone_2', header: 'Phone 2', enableHiding: true,
      muiEditTextFieldProps: { inputMode: 'tel' } },

    { accessorKey: 'contact_name_3', header: 'Contact 3', enableHiding: true },
    { accessorKey: 'email_3', header: 'Email 3', enableHiding: true,
      muiEditTextFieldProps: { type: 'email' } },
    { accessorKey: 'phone_3', header: 'Phone 3', enableHiding: true,
      muiEditTextFieldProps: { inputMode: 'tel' } },

    { accessorKey: 'contact_name_4', header: 'Contact 4', enableHiding: true },
    { accessorKey: 'email_4', header: 'Email 4', enableHiding: true,
      muiEditTextFieldProps: { type: 'email' } },
    { accessorKey: 'phone_4', header: 'Phone 4', enableHiding: true,
      muiEditTextFieldProps: { inputMode: 'tel' } },

    { accessorKey: 'contact_name_5', header: 'Contact 5', enableHiding: true },
    { accessorKey: 'email_5', header: 'Email 5', enableHiding: true,
      muiEditTextFieldProps: { type: 'email' } },
    { accessorKey: 'phone_5', header: 'Phone 5', enableHiding: true,
      muiEditTextFieldProps: { inputMode: 'tel' } },

    { accessorKey: 'contact_name_6', header: 'Contact 6', enableHiding: true },
    { accessorKey: 'email_6', header: 'Email 6', enableHiding: true,
      muiEditTextFieldProps: { type: 'email' } },
    { accessorKey: 'phone_6', header: 'Phone 6', enableHiding: true,
      muiEditTextFieldProps: { inputMode: 'tel' } },

    // Coords ocultas
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
          <StatCard label="Total Centers" value={stats.totalCenters} />
          <StatCard label="Countries" value={stats.uniqueCountries} />
          <StatCard label="Total Contacts" value={stats.totalContacts} />
        </div>

        {!loading && data.length === 0 && (
          <div className="text-center text-gray-500 mb-4">
            No centers found — try “Register New Center”.
          </div>
        )}

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
          renderRowActions={({
            row,
            table,
          }: {
            row: MRT_Row<Center>;
            table: MRT_TableInstance<Center>;
          }) => (
            <div className="flex gap-2">
              <button
                onClick={() => table.setEditingRow(row)}
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
              contact_name_2: false, email_2: false, phone_2: false,
              contact_name_3: false, email_3: false, phone_3: false,
              contact_name_4: false, email_4: false, phone_4: false,
              contact_name_5: false, email_5: false, phone_5: false,
              contact_name_6: false, email_6: false, phone_6: false,
              latitude: true, longitude: true,
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