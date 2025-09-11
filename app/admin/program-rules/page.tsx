'use client';

import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
  MaterialReactTable,
  type MRT_ColumnDef,
  type MRT_Row,
  type MRT_TableInstance,
} from 'material-react-table';
import Link from 'next/link';

type Rule = {
  id: number;
  country: string;
  zip_pattern: string | null;
  zip_from: number | null;
  zip_to: number | null;
  age_from: number | null;
  age_to: number | null;
  program_code: string;
  program_name: string;
  message: string;
  website: string | null;
  priority: number;
  active: boolean;
};

const EU_COUNTRIES = [
  'Austria','Belgium','Bulgaria','Croatia','Cyprus','Czech Republic','Denmark',
  'Estonia','Finland','France','Germany','Greece','Hungary','Iceland','Ireland',
  'Italy','Latvia','Liechtenstein','Lithuania','Luxembourg','Malta','Netherlands',
  'Norway','Poland','Portugal','Romania','Slovakia','Slovenia','Spain','Sweden',
  'Switzerland','United Kingdom'
].map((c) => ({ value: c, label: c }));

export default function AdminProgramRulesPage() {
  const [data, setData] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);

  // load
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/program-rules/list', { cache: 'no-store' });
        const rows = await res.json();
        setData(Array.isArray(rows) ? rows : []);
      } catch {
        toast.error('Failed to load rules');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const columns = useMemo<MRT_ColumnDef<Rule>[]>(() => [
    { accessorKey: 'country', header: 'Country', editVariant: 'select', editSelectOptions: EU_COUNTRIES,
      muiEditTextFieldProps: { select: true, required: true } },

    { accessorKey: 'zip_pattern', header: 'ZIP Pattern (regex)' },
    { accessorKey: 'zip_from', header: 'ZIP From', muiEditTextFieldProps: { type: 'number' } },
    { accessorKey: 'zip_to', header: 'ZIP To', muiEditTextFieldProps: { type: 'number' } },

    { accessorKey: 'age_from', header: 'Age From', muiEditTextFieldProps: { type: 'number' } },
    { accessorKey: 'age_to', header: 'Age To', muiEditTextFieldProps: { type: 'number' } },

    { accessorKey: 'program_code', header: 'Program Code', muiEditTextFieldProps: { required: true } },
    { accessorKey: 'program_name', header: 'Program Name', muiEditTextFieldProps: { required: true } },

    { accessorKey: 'message', header: 'Message', muiEditTextFieldProps: { required: true } },
    { accessorKey: 'website', header: 'Website (URL)' },

    { accessorKey: 'priority', header: 'Priority', muiEditTextFieldProps: { type: 'number' } },
    {
      accessorKey: 'active',
      header: 'Active',
      Cell: ({ cell }) => (
        <span className={cell.getValue<boolean>() ? 'text-green-700' : 'text-gray-400'}>
          {cell.getValue<boolean>() ? 'Yes' : 'No'}
        </span>
      ),
      editVariant: 'select',
      editSelectOptions: [
        { value: true, label: 'Yes' },
        { value: false, label: 'No' },
      ],
      muiEditTextFieldProps: { select: true },
    },
  ], []);

  async function createRule(values: Partial<Rule>) {
    const clean: any = { ...values };
    ['zip_from','zip_to','age_from','age_to','priority'].forEach(k => {
      if (clean[k] === '' || clean[k] === undefined) clean[k] = null;
      else clean[k] = Number(clean[k]);
      if (Number.isNaN(clean[k])) clean[k] = null;
    });
    if (clean.active === 'true') clean.active = true;
    if (clean.active === 'false') clean.active = false;

    const res = await fetch('/api/program-rules/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(clean),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }

  async function updateRule(id: number, values: Partial<Rule>) {
    const clean: any = { ...values };
    ['zip_from','zip_to','age_from','age_to','priority'].forEach(k => {
      if (clean[k] === '' || clean[k] === undefined) delete clean[k];
      else {
        clean[k] = Number(clean[k]);
        if (Number.isNaN(clean[k])) clean[k] = null;
      }
    });
    const res = await fetch(`/api/program-rules/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(clean),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }

  async function deleteRule(id: number) {
    const res = await fetch(`/api/program-rules/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }

  const onSaveRow = async ({
    exitEditingMode,
    row,
    values,
  }: {
    exitEditingMode: () => void;
    row: MRT_Row<Rule>;
    values: Partial<Rule>;
  }) => {
    try {
      await updateRule(row.original.id, values);
      setData(prev => prev.map(r => r.id === row.original.id ? { ...r, ...values } as Rule : r));
      toast.success('Updated');
      exitEditingMode();
    } catch (e: any) {
      toast.error(e?.message || 'Update failed');
    }
  };

  const onCreateRow = async (values: Partial<Rule>, table: MRT_TableInstance<Rule>) => {
    try {
      const { id } = await createRule(values);
      toast.success('Created');
      // recarga rápida
      setData(prev => [{ id, ...(values as any) }, ...prev]);
      table.setCreatingRow(null);
    } catch (e: any) {
      toast.error(e?.message || 'Create failed');
    }
  };

  return (
    <div className="px-4 py-8 bg-gray-100 min-h-screen">
      <div className="max-w-7xl mx-auto bg-white rounded-2xl shadow p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-inodia-blue">Program Rules – Admin</h1>
          <div className="flex gap-2">
            <Link href="/admin" className="px-3 py-2 rounded-md border text-sm hover:bg-gray-50">⚙️ Admin Panel</Link>
            <Link href="/sites/list" className="px-3 py-2 rounded-md border text-sm hover:bg-gray-50">📄 Sites List</Link>
          </div>
        </div>

        <MaterialReactTable
          columns={columns}
          data={data}
          state={{ isLoading: loading }}
          enableRowActions
          enableEditing
          editDisplayMode="modal"
          onEditingRowSave={onSaveRow}
          renderRowActions={({ row, table }: { row: MRT_Row<Rule>; table: MRT_TableInstance<Rule> }) => (
            <div className="flex gap-2">
              <button
                onClick={() => table.setEditingRow(row)}
                className="px-2 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Edit
              </button>
              <button
                onClick={async () => {
                  if (!confirm('Delete this rule?')) return;
                  try {
                    await deleteRule(row.original.id);
                    setData(prev => prev.filter(r => r.id !== row.original.id));
                    toast.success('Deleted');
                  } catch (e: any) {
                    toast.error(e?.message || 'Delete failed');
                  }
                }}
                className="px-2 py-1 text-sm bg-gray-200 rounded hover:bg-gray-300"
              >
                Delete
              </button>
            </div>
          )}
          renderTopToolbarCustomActions={({ table }) => (
            <button
              onClick={() => table.setCreatingRow(true)}
              className="px-3 py-2 text-sm bg-inodia-blue text-white rounded hover:bg-blue-700"
            >
              + New Rule
            </button>
          )}
          onCreatingRowSave={({ values, table }) => onCreateRow(values as Partial<Rule>, table)}
          initialState={{
            pagination: { pageIndex: 0, pageSize: 10 },
            sorting: [{ id: 'priority', desc: false }],
          }}
          muiTableContainerProps={{ className: 'rounded-lg border border-gray-200' }}
          muiTableHeadCellProps={{ className: 'bg-gray-100 font-semibold text-sm text-gray-700' }}
          muiTableBodyCellProps={{ className: 'text-sm' }}
        />
      </div>
    </div>
  );
}