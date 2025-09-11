// app/components/AdminCenterEditorB.tsx
'use client';

import {
  MaterialReactTable,
  type MRT_ColumnDef,
  type MRT_Row,
  type MRT_TableInstance,
} from 'material-react-table';
import { useMemo, useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import ConfirmModal from './ConfirmModal';
import ProgramRulesEditor from './ProgramRulesEditor';
import AddColumnModal from './AddColumnModal';

function StatCard({ label, value }: { label: string | number; value: string | number }) {
  return (
    <div className="bg-white shadow rounded-lg p-4 text-center">
      <div className="text-2xl font-bold text-inodia-blue">{value}</div>
      <div className="text-sm text-gray-600 mt-1">{label}</div>
    </div>
  );
}

const TYPE_OF_ED_OPTIONS = [
  { value: 'High Risk', label: 'High Risk' },
  { value: 'General Population', label: 'General Population' },
  { value: 'Both', label: 'Both' },
];

const EU_COUNTRIES = [
  'Austria','Belgium','Bulgaria','Croatia','Cyprus','Czech Republic','Denmark',
  'Estonia','Finland','France','Germany','Greece','Hungary','Iceland','Ireland',
  'Italy','Latvia','Liechtenstein','Lithuania','Luxembourg','Malta','Netherlands',
  'Norway','Poland','Portugal','Romania','Slovakia','Slovenia','Spain','Sweden',
  'Switzerland','United Kingdom'
].map((c) => ({ value: c, label: c }));

type Center = Record<string, any>;

type ColumnMeta = {
  column_name: string;
  data_type: string;       // e.g. 'text', 'integer', 'boolean', 'timestamp without time zone', 'double precision'
  is_nullable: 'YES' | 'NO';
  column_default: string | null;
};

const RAW_BASE = process.env.NEXT_PUBLIC_API_BASE || '';
const API_BASE = RAW_BASE.replace(/\/+$/, ''); // sin barras finales
const ADMIN_TOKEN = process.env.NEXT_PUBLIC_ADMIN_TOKEN || '';

function toIntOrNull(v: unknown): number | null {
  if (v === '' || v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

export default function AdminCenterEditorB() {
  const [tab, setTab] = useState<'centers' | 'rules'>('centers');

  const [schema, setSchema] = useState<ColumnMeta[]>([]);
  const [columns, setColumns] = useState<MRT_ColumnDef<Center>[]>([]);
  const [data, setData] = useState<Center[]>([]);
  const [loading, setLoading] = useState(true);

  const [centerToDelete, setCenterToDelete] = useState<Center | null>(null);
  const [addColOpen, setAddColOpen] = useState(false);

  // -------- load schema
  const fetchSchema = useCallback(async () => {
    try {
      // intenta wrapper local primero (si lo tuvieras) y si falla, ve directo a la Lambda
      const tryUrls = [
        `/api/admin/columns?table=clinical_centers`,
        `${API_BASE}/admin/columns?table=clinical_centers`,
      ];
      let lastErr: any;
      for (const url of tryUrls) {
        try {
          const r = await fetch(url, { cache: 'no-store' });
          if (!r.ok) throw new Error(await r.text());
          const js = await r.json();
          const cols: ColumnMeta[] = Array.isArray(js) ? js : js.columns;
          if (cols?.length) {
            setSchema(cols);
            return;
          }
        } catch (e) {
          lastErr = e;
        }
      }
      throw lastErr || new Error('No schema endpoint');
    } catch (e: any) {
      console.error(e);
      toast.error('Failed loading schema');
    }
  }, []);

  // -------- load data
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // idem: wrapper local si existiera -> Lambda
      const tryUrls = [
        '/api/sites/list',                 // tu wrapper tradicional (si apunta a SELECT * ahora)
        `${API_BASE}/centers`,             // Lambda directa
      ];
      let ok = false;
      for (const url of tryUrls) {
        try {
          const r = await fetch(url, { cache: 'no-store' });
          if (!r.ok) throw new Error(await r.text());
          const js = await r.json();
          const arr: Center[] = Array.isArray(js) ? js : (js.centers || js || []);
          if (arr) {
            setData(arr);
            ok = true;
            break;
          }
        } catch {}
      }
      if (!ok) throw new Error('No data');
    } catch (e: any) {
      console.error(e);
      toast.error('❌ Failed to load centers');
    } finally {
      setLoading(false);
    }
  }, []);

  // -------- build columns from schema (with special rules for known fields)
  useEffect(() => {
    if (!schema?.length) {
      setColumns([]);
      return;
    }

    const prettify = (k: string) =>
      k.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

    const special: Record<string, MRT_ColumnDef<Center>> = {
      country: {
        accessorKey: 'country',
        header: 'Country',
        size: 60,
        editVariant: 'select',
        editSelectOptions: EU_COUNTRIES,
        muiEditTextFieldProps: { select: true, required: true },
      },
      type_of_ed: {
        accessorKey: 'type_of_ed',
        header: 'Type of ED',
        editVariant: 'select',
        editSelectOptions: TYPE_OF_ED_OPTIONS,
        muiEditTextFieldProps: { select: true },
      },
      monitor: {
        accessorKey: 'monitor',
        header: 'Monitor',
        size: 60,
        Cell: ({ cell }) => {
          const v = cell.getValue();
          if (v == null) return '—';
          return (
            <span
              className="inline-block px-2 py-0.5 rounded text-xs"
              style={{
                background: v ? '#DCFCE7' : '#F3F4F6',
                color: v ? '#065F46' : '#374151',
              }}
            >
              {v ? 'Yes' : 'No'}
            </span>
          );
        },
        editVariant: 'select',
        editSelectOptions: [
          { value: true as any, label: 'Yes' },
          { value: false as any, label: 'No' },
          { value: '' as any, label: '—' },
        ],
        muiEditTextFieldProps: { select: true },
      },
    };

    const defs: MRT_ColumnDef<Center>[] = [];

    for (const col of schema) {
      const key = col.column_name;
      if (key === 'id') continue; // lo tratamos como PK no editable/oculto
      if (key === 'created_at') continue;

      if (special[key]) {
        defs.push(special[key]);
        continue;
      }

      const dt = col.data_type.toLowerCase();
      const base: MRT_ColumnDef<Center> = {
        accessorKey: key,
        header: prettify(key),
        enableHiding: true,
      };

      // heurística por tipo
      if (dt.includes('integer')) {
        base.muiEditTextFieldProps = { type: 'number', inputProps: { step: 1 } };
      } else if (dt.includes('double')) {
        base.muiEditTextFieldProps = { type: 'number', inputProps: { step: 'any' } };
      } else if (dt.includes('boolean')) {
        base.editVariant = 'select';
        // muestra como Yes/No/— al editar
        base.editSelectOptions = [
          { value: true as any, label: 'Yes' },
          { value: false as any, label: 'No' },
          { value: '' as any, label: '—' },
        ];
        base.muiEditTextFieldProps = { select: true };
        base.Cell = ({ cell }) => {
          const v = cell.getValue();
          if (v == null) return '—';
          return (
            <span
              className="inline-block px-2 py-0.5 rounded text-xs"
              style={{
                background: v ? '#DCFCE7' : '#F3F4F6',
                color: v ? '#065F46' : '#374151',
              }}
            >
              {v ? 'Yes' : 'No'}
            </span>
          );
        };
      } else if (dt.includes('timestamp') || dt.includes('date')) {
        base.muiEditTextFieldProps = { type: 'datetime-local' }; // o 'date' si prefieres
      } else if (dt.includes('text') || dt.includes('character')) {
        // TEXT / VARCHAR → sin props especiales
      }

      defs.push(base);
    }

    // asegura que 'name', 'address', 'city', 'zip_code' queden primeras si existen
    const orderPriority = new Map([
      ['name', 1],
      ['address', 2],
      ['city', 3],
      ['country', 4],
      ['zip_code', 5],
      ['type_of_ed', 6],
      ['detect_site', 7],
    ]);
    defs.sort((a, b) => {
      const ak = a.accessorKey as string;
      const bk = b.accessorKey as string;
      const pa = orderPriority.get(ak) || 999;
      const pb = orderPriority.get(bk) || 999;
      return pa - pb || ak.localeCompare(bk);
    });

    setColumns(defs);
  }, [schema]);

  // cargar schema y data al entrar en la pestaña centers
  useEffect(() => {
    if (tab !== 'centers') return;
    (async () => {
      await fetchSchema();
      await fetchData();
    })();
  }, [tab, fetchSchema, fetchData]);

  // KPIs simples
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

  // guardar edición
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

      // normaliza conocidos
      if ('age_from' in payload) payload.age_from = toIntOrNull(payload.age_from as any);
      if ('age_to' in payload) payload.age_to = toIntOrNull(payload.age_to as any);
      if ('monitor' in payload && payload.monitor === '') payload.monitor = null;

      delete (payload as any).id;
      Object.keys(payload).forEach((k) => {
        if ((payload as any)[k] === undefined) delete (payload as any)[k];
      });

      // usamos Lambda directa
      const res = await fetch(`${API_BASE}/centers/${row.original.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text());

      toast.success(`✅ Updated: ${values.name ?? row.original.name ?? row.original.id}`);
      // rehidrata (para reflejar tipos/normalizaciones del back)
      await fetchData();
      exitEditingMode();
    } catch (e) {
      console.error(e);
      toast.error('❌ Error updating center');
    }
  };

  // borrar
  const confirmDelete = async () => {
    if (!centerToDelete) return;
    try {
      const res = await fetch(`${API_BASE}/centers/${centerToDelete.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(await res.text());
      toast.success(`🗑️ Deleted: ${centerToDelete.name ?? centerToDelete.id}`);
      setData((prev) => prev.filter((c) => c.id !== centerToDelete.id));
    } catch {
      toast.error('❌ Error deleting center');
    } finally {
      setCenterToDelete(null);
    }
  };

  // Utilidades
  async function ensureStdColumns() {
    try {
      const res = await fetch(`${API_BASE}/admin/add-schema`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(ADMIN_TOKEN ? { 'X-Admin-Token': ADMIN_TOKEN } : {}),
        },
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success('Schema ensured ✅');
      await fetchSchema();
      await fetchData();
    } catch (e: any) {
      toast.error(`Failed: ${e?.message || e}`);
    }
  }

  const refreshAll = async () => {
    await fetchSchema();
    await fetchData();
  };

  return (
    <div className="px-4 py-8 bg-gray-100 min-h-screen">
      <div className="max-w-7xl mx-auto bg-white rounded-2xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <img src="/innodia_cristal.png" alt="INNODIA Logo" className="w-10 h-10" />
            <h1 className="text-2xl font-bold text-inodia-blue">Admin</h1>
          </div>

          {/* Tabs + tools */}
          <div className="flex items-center gap-2">
            <button
              className={`px-4 py-2 rounded-md ${tab === 'centers' ? 'bg-inodia-blue text-white' : 'bg-gray-100'}`}
              onClick={() => setTab('centers')}
            >
              Clinical Centers
            </button>
            <button
              className={`px-4 py-2 rounded-md ${tab === 'rules' ? 'bg-inodia-blue text-white' : 'bg-gray-100'}`}
              onClick={() => setTab('rules')}
            >
              Program Rules
            </button>

            {tab === 'centers' && (
              <>
                <button
                  onClick={ensureStdColumns}
                  className="ml-2 px-3 py-2 rounded-md bg-gray-100 hover:bg-gray-200 text-sm"
                  title="Ensure age_from, age_to, monitor (+geo)"
                >
                  Ensure std. columns
                </button>

                <button
                  onClick={() => setAddColOpen(true)}
                  className="px-3 py-2 rounded-md bg-gray-100 hover:bg-gray-200 text-sm"
                  title="Add any column"
                >
                  Add column…
                </button>

                <button
                  onClick={refreshAll}
                  className="px-3 py-2 rounded-md bg-gray-100 hover:bg-gray-200 text-sm"
                  title="Reload schema and data"
                >
                  Refresh schema
                </button>
              </>
            )}
          </div>
        </div>

        {tab === 'centers' ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <StatCard label="Total Centers" value={data.length} />
              <StatCard label="Countries" value={new Set(data.map(d => d.country).filter(Boolean)).size} />
              <StatCard label="Total Contacts" value={
                data.reduce((acc, c) => {
                  const names = [
                    c.contact_name_1, c.contact_name_2, c.contact_name_3,
                    c.contact_name_4, c.contact_name_5, c.contact_name_6,
                  ];
                  return acc + names.filter(Boolean).length;
                }, 0)
              } />
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
                  latitude: true, longitude: true,
                },
              }}
              muiTableContainerProps={{ className: 'rounded-lg border border-gray-200' }}
              muiTableHeadCellProps={{ className: 'bg-gray-100 font-semibold text-sm text-gray-700' }}
              muiTableBodyCellProps={{ className: 'text-sm' }}
              paginationDisplayMode="pages"
              muiPaginationProps={{ rowsPerPageOptions: [5, 10, 20, 50] }}
            />

            <ConfirmModal
              isOpen={!!centerToDelete}
              title="Confirm Deletion"
              message="Are you sure you want to delete"
              highlight={centerToDelete?.name}
              onCancel={() => setCenterToDelete(null)}
              onConfirm={confirmDelete}
            />

            {/* El modal que ya usas (apunta a tu wrapper /api/admin/add-column). 
               Tras añadir columnas, pulsa "Refresh schema" para que aparezcan automáticamente */}
            <AddColumnModal
              open={addColOpen}
              onClose={() => setAddColOpen(false)}
              table="clinical_centers"
              onSuccess={refreshAll}
            />
          </>
        ) : (
          <ProgramRulesEditor />
        )}
      </div>
    </div>
  );
}