// app/components/ProgramRulesEditor.tsx
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

  postal_format: string | null; // p. ej. "NNNNN", "XX-XXX", "N/A"
  rule_pattern: string | null;  // p. ej. "40000-40999", "20***-29***;38***", "*"

  age_from: number | null;
  age_to: number | null;

  program_key: string;          // p. ej. "EDENT1FI" | "DiaUnion"
  program_name: string;         // nombre legible
  program_url: string | null;   // URL (antes "website")

  type_of_ed: 'General population' | 'High risk' | 'Both' | null;
  notes: string | null;
};

const EU_COUNTRIES = [
  'Austria','Belgium','Bulgaria','Croatia','Cyprus','Czech Republic','Denmark',
  'Estonia','Finland','France','Germany','Greece','Hungary','Iceland','Ireland',
  'Italy','Latvia','Liechtenstein','Lithuania','Luxembourg','Malta','Netherlands',
  'Norway','Poland','Portugal','Romania','Slovakia','Slovenia','Spain','Sweden',
  'Switzerland','United Kingdom',
].map((c) => ({ value: c, label: c }));

// Usa las etiquetas exactamente como están en tu BD (según captura).
const TYPE_OF_ED_OPTIONS = [
  { value: 'General population', label: 'General population' },
  { value: 'High risk', label: 'High risk' },
  { value: 'Both', label: 'Both' },
];

const toIntOrNull = (v: unknown): number | null => {
  if (v === '' || v === undefined || v === null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : null;
};

export default function ProgramRulesEditor() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [toDelete, setToDelete] = useState<Rule | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/program-rules/list', { cache: 'no-store' });
      const data = await res.json();
      setRules(Array.isArray(data) ? data : (data.rules || []));
    } catch (e) {
      console.error(e);
      toast.error('Failed loading rules');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const columns = useMemo<MRT_ColumnDef<Rule>[]>(() => [
    // País
    {
      accessorKey: 'country',
      header: 'Country',
      size: 150,
      editVariant: 'select',
      editSelectOptions: EU_COUNTRIES,
      muiEditTextFieldProps: { select: true, required: true },
    },

    // Formato postal y patrón de regla (ambos existen en tu tabla)
    {
      accessorKey: 'postal_format',
      header: 'Postal Format',
      size: 140,
      muiEditTextFieldProps: {
        placeholder: 'e.g., NNNNN / XX-XXX / NNNN / N/A',
      },
    },
    {
      accessorKey: 'rule_pattern',
      header: 'Postal Pattern',
      size: 220,
      muiEditTextFieldProps: {
        placeholder: 'e.g., 40000-40999 or 20***-29***;38*** or *',
      },
    },

    // Rango de edad
    {
      accessorKey: 'age_from',
      header: 'Age From',
      size: 80,
      muiEditTextFieldProps: { type: 'number', inputProps: { min: 0 } },
    },
    {
      accessorKey: 'age_to',
      header: 'Age To',
      size: 80,
      muiEditTextFieldProps: { type: 'number', inputProps: { min: 0 } },
    },

    // Tipo de ED
    {
      accessorKey: 'type_of_ed',
      header: 'Type of ED',
      size: 160,
      editVariant: 'select',
      editSelectOptions: TYPE_OF_ED_OPTIONS,
      muiEditTextFieldProps: { select: true },
    },

    // Programa
    {
      accessorKey: 'program_key',
      header: 'Program Key',
      size: 120,
      muiEditTextFieldProps: { placeholder: 'e.g., EDENT1FI, DiaUnion' },
    },
    {
      accessorKey: 'program_name',
      header: 'Program',
      size: 180,
      muiEditTextFieldProps: { required: true },
    },
    {
      accessorKey: 'program_url',
      header: 'Website',
      size: 260,
      Cell: ({ cell }) => {
        const url = cell.getValue<string | null>();
        if (!url) return null;
        try {
          const u = new URL(url);
          return (
            <a
              href={u.toString()}
              target="_blank"
              rel="noreferrer"
              className="text-blue-600 hover:underline"
            >
              {u.hostname}
            </a>
          );
        } catch {
          return url;
        }
      },
    },

    // Notas
    { accessorKey: 'notes', header: 'Notes', size: 260 },
  ], []);

  // Crear con valores por defecto razonables
  const handleCreate = async (template?: Partial<Rule>) => {
    try {
      const draft: Partial<Rule> = {
        country: 'Germany',
        postal_format: 'NNNNN',
        rule_pattern: '*',
        age_from: null,
        age_to: null,
        type_of_ed: 'General population',
        program_key: 'EDENT1FI',
        program_name: 'New program',
        program_url: '',
        notes: '',
        ...template,
      };

      const payload: Record<string, any> = {
        ...draft,
        age_from: toIntOrNull(draft.age_from as any),
        age_to: toIntOrNull(draft.age_to as any),
      };

      // Limpia strings vacíos a null
      Object.keys(payload).forEach((k) => {
        if (payload[k] === '') payload[k] = null;
      });

      const res = await fetch('/api/program-rules/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text().catch(() => 'Create failed'));
      const created = await res.json();
      const rule: Rule = created.rule || created;
      setRules((prev) => [rule, ...prev]);
      toast.success('Rule created');
    } catch (e) {
      console.error(e);
      toast.error('Create failed');
    }
  };

  // Guardar edición (PUT solo con campos editados)
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

      // limpia vacíos -> null, y quita id
      delete (payload as any).id;
      Object.keys(payload).forEach((k) => {
        if (payload[k as keyof typeof payload] === '') payload[k as keyof typeof payload] = null;
      });

      const res = await fetch(`/api/program-rules/${row.original.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text());

      toast.success('Updated');
      setRules((prev) =>
        prev.map((r) => (r.id === row.original.id ? ({ ...r, ...values } as Rule) : r))
      );
      exitEditingMode();
    } catch (e) {
      console.error(e);
      toast.error('Update failed');
    }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    try {
      const res = await fetch(`/api/program-rules/${toDelete.id}`, { method: 'DELETE' });
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
      <div className="mb-4 flex items-center justify-between">
        <p className="text-gray-600">
          Manage geographic/age rules to redirect users to programs (EDENT1FI, DiaUnion, etc.).
        </p>
        <button
          onClick={() => handleCreate()}
          className="px-3 py-2 bg-inodia-blue text-white rounded hover:bg-blue-700"
        >
          ➕ New Rule
        </button>
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
          columnOrder: [
            'mrt-row-actions',
            'country',
            'postal_format',
            'rule_pattern',
            'age_from',
            'age_to',
            'type_of_ed',
            'program_key',
            'program_name',
            'program_url',
            'notes',
          ],
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