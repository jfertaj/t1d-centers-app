'use client';

import {
  MaterialReactTable,
  type MRT_ColumnDef,
  type MRT_Row,
  type MRT_TableInstance,
} from 'material-react-table';
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import ConfirmModal from './ConfirmModal';

type Rule = {
  id: number;
  country: string;
  postal_pattern: string | null; // ej: "1000-4050", "40***", regex, etc.
  age_from: number | null;
  age_to: number | null;
  program_name: string;
  website: string | null;
  notes: string | null;
  type_of_ed: string | null; // "General Population" | "High Risk"
};

const EU_COUNTRIES = [
  'Austria','Belgium','Bulgaria','Croatia','Cyprus','Czech Republic','Denmark',
  'Estonia','Finland','France','Germany','Greece','Hungary','Iceland','Ireland',
  'Italy','Latvia','Liechtenstein','Lithuania','Luxembourg','Malta','Netherlands',
  'Norway','Poland','Portugal','Romania','Slovakia','Slovenia','Spain','Sweden',
  'Switzerland','United Kingdom'
].map((c) => ({ value: c, label: c }));

const TYPE_OF_ED_OPTIONS = [
  { value: 'General Population', label: 'General Population' },
  { value: 'High Risk', label: 'High Risk' },
  { value: 'Both', label: 'Both'},
];

function toIntOrNull(v: unknown): number | null {
  if (v === '' || v === undefined || v === null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

export default function ProgramRulesEditor() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [toDelete, setToDelete] = useState<Rule | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/program-rules/list', { cache: 'no-store' });
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        setRules(Array.isArray(data) ? data : (data.rules || []));
      } catch (e) {
        console.error(e);
        toast.error('Failed loading rules');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const columns = useMemo<MRT_ColumnDef<Rule>[]>(() => [
    {
      accessorKey: 'country',
      header: 'Country',
      editVariant: 'select',
      editSelectOptions: EU_COUNTRIES,
      muiEditTextFieldProps: { select: true, required: true },
    },
    { accessorKey: 'postal_pattern', header: 'Postal Pattern', size: 200,
      muiEditTextFieldProps: { placeholder: 'e.g., 40*** or 1000-4050' } },
    { accessorKey: 'age_from', header: 'Age From', size: 60,
      muiEditTextFieldProps: { type: 'number', inputProps: { min: 0 } } },
    { accessorKey: 'age_to', header: 'Age To', size: 60,
      muiEditTextFieldProps: { type: 'number', inputProps: { min: 0 } } },
    {
      accessorKey: 'type_of_ed',
      header: 'Type of ED',
      editVariant: 'select',
      editSelectOptions: TYPE_OF_ED_OPTIONS,
      muiEditTextFieldProps: { select: true },
    },
    { accessorKey: 'program_name', header: 'Program', size: 160,
      muiEditTextFieldProps: { required: true } },
    { accessorKey: 'website', header: 'Website', size: 200 },
    { accessorKey: 'notes', header: 'Notes', size: 200 },
  ], []);

  const handleCreate = async (values: Partial<Rule>) => {
    try {
      const payload = { ...values };
      payload.age_from = toIntOrNull(payload.age_from as any);
      payload.age_to = toIntOrNull(payload.age_to as any);

      const res = await fetch('/api/program-rules/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text());
      const created = await res.json();
      const rule: Rule = created.rule || created;
      setRules((prev) => [rule, ...prev]);
      toast.success('Rule created');
    } catch (e) {
      console.error(e);
      toast.error('Create failed');
    }
  };

  const handleSaveRow = async ({
    exitEditingMode,
    row,
    values,
  }: {
    exitEditingMode: () => void;
    row: MRT_Row<Rule>;
    values: Partial<Rule>;
  }) => {
    try {
      const payload: Record<string, unknown> = { ...values };
      if ('age_from' in payload) payload.age_from = toIntOrNull(payload.age_from as any);
      if ('age_to' in payload) payload.age_to = toIntOrNull(payload.age_to as any);
      delete (payload as any).id;

      const res = await fetch(`/api/program-rules/admin/update/${row.original.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success('Updated');
      setRules((prev) => prev.map((r) => r.id === row.original.id ? { ...r, ...values } as Rule : r));
      exitEditingMode();
    } catch (e) {
      console.error(e);
      toast.error('Update failed');
    }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    try {
      const res = await fetch(`/api/program-rules/admin/delete/${toDelete.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(await res.text());
      setRules((prev) => prev.filter((r) => r.id !== toDelete.id));
      toast.success('Deleted');
    } catch (e) {
      console.error(e);
      toast.error('Delete failed');
    } finally {
      setToDelete(null);
    }
  };

  return (
    <div>
      <div className="mb-4">
        <p className="text-gray-600">
          Manage geographic/age rules to redirect users to programs (EDENT1FI, DiaUnion, etc.).
        </p>
      </div>

      <MaterialReactTable
        columns={columns}
        data={rules}
        state={{ isLoading: loading }}
        enableColumnOrdering
        enableColumnFilters
        enableDensityToggle
        enableFullScreenToggle
        enableHiding
        enableRowActions
        renderTopToolbarCustomActions={() => (
          <button
            onClick={() =>
              handleCreate({
                country: 'Germany',
                postal_pattern: null,
                age_from: null,
                age_to: null,
                program_name: 'New program',
                website: '',
                notes: '',
                type_of_ed: 'General Population',
              })
            }
            className="px-3 py-2 bg-inodia-blue text-white rounded hover:bg-blue-700"
          >
            ➕ New Rule
          </button>
        )}
        renderRowActions={({
          row,
          table,
        }: {
          row: MRT_Row<Rule>;
          table: MRT_TableInstance<Rule>;
        }) => (
          <div className="flex gap-2">
            <button
              onClick={() => table.setEditingRow(row)}
              className="px-2 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Edit
            </button>
            <button
              onClick={() => setToDelete(row.original)}
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
        }}
      />

      <ConfirmModal
        isOpen={!!toDelete}
        title="Confirm Deletion"
        message="Delete rule"
        highlight={`${toDelete?.program_name ?? ''} (${toDelete?.country ?? ''})`}
        onCancel={() => setToDelete(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}