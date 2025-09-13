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
import Link from 'next/link';

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
  data_type: string;
  is_nullable: 'YES' | 'NO';
  column_default: string | null;
};

const RAW_BASE = process.env.NEXT_PUBLIC_API_BASE || '';
const API_BASE = RAW_BASE.replace(/\/+$/, ''); // sin barras finales

function toIntOrNull(v: unknown): number | null {
  if (v === '' || v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

// Heurística para convertir detect_site (texto legacy) a booleano
function coerceDetectBool(v: any): boolean | null {
  if (v == null || v === '') return null;
  const s = String(v).toLowerCase().trim();
  if (['1','true','yes','y','t'].includes(s)) return true;
  if (['0','false','no','n','f'].includes(s)) return false;
  if (s.includes('yes')) return true;
  if (s.includes('no')) return false;
  return null;
}

export default function AdminCenterEditorB() {
  const [tab, setTab] = useState<'centers' | 'rules'>('centers');

  const [schema, setSchema] = useState<ColumnMeta[]>([]);
  const [columns, setColumns] = useState<MRT_ColumnDef<Center>[]>([]);
  const [data, setData] = useState<Center[]>([]);
  const [loading, setLoading] = useState(true);

  const [centerToDelete, setCenterToDelete] = useState<Center | null>(null);
  const [addColOpen, setAddColOpen] = useState(false);

  // -------- load schema (SIEMPRE vía proxy Next)
  const fetchSchema = useCallback(async () => {
    try {
      const r = await fetch(`/api/admin/columns?table=clinical_centers`, { cache: 'no-store' });
      if (!r.ok) throw new Error(await r.text());
      const js = await r.json();
      const cols: ColumnMeta[] = Array.isArray(js) ? js : js.columns;
      if (!cols?.length) throw new Error('Empty schema');
      setSchema(cols);
    } catch (e: any) {
      console.error(e);
      toast.error('Failed loading schema');
    }
  }, []);

  // -------- load data
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const tryUrls = ['/api/sites/list', `${API_BASE}/centers`];
      let loaded = false;
      for (const url of tryUrls) {
        try {
          const r = await fetch(url, { cache: 'no-store' });
          if (!r.ok) throw new Error(await r.text());
          const js = await r.json();
          const arr: Center[] = Array.isArray(js) ? js : (js.centers || js || []);

          // Deriva detect_site_bool desde detect_site si no existe
          const normalized = (arr || []).map((c) => {
            const out = { ...c } as any;
            if (!('detect_site_bool' in out)) {
              out.detect_site_bool = coerceDetectBool(out.detect_site);
            }
            return out;
          });

          setData(normalized);
          loaded = true;
          break;
        } catch {}
      }
      if (!loaded) throw new Error('No data');
    } catch (e: any) {
      console.error(e);
      toast.error('❌ Failed to load centers');
    } finally {
      setLoading(false);
    }
  }, [API_BASE]);

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
      // Detect Site como booleano (desde legacy)
      detect_site_bool: {
        accessorKey: 'detect_site_bool',
        header: 'Detect Site',
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
          { value: '' as any, label: '—' }, // null
        ],
        muiEditTextFieldProps: { select: true },
      },
    };

    const defs: MRT_ColumnDef<Center>[] = [];

    for (const col of schema) {
      const key = col.column_name;
      if (key === 'id' || key === 'created_at') continue;

      // oculta la textual antigua si existe
      if (key === 'detect_site') continue;

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

      if (dt.includes('integer')) {
        base.muiEditTextFieldProps = { type: 'number', inputProps: { step: 1 } };
      } else if (dt.includes('double')) {
        base.muiEditTextFieldProps = { type: 'number', inputProps: { step: 'any' } };
      } else if (dt.includes('boolean')) {
        base.editVariant = 'select';
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
      } else if (dt.includes('timestamp')) {
        base.muiEditTextFieldProps = { type: 'datetime-local' };
      } else if (dt.includes('date')) {
        base.muiEditTextFieldProps = { type: 'date' };
      }

      defs.push(base);
    }

    const orderPriority = new Map([
      ['name', 1],
      ['address', 2],
      ['city', 3],
      ['country', 4],
      ['zip_code', 5],
      ['type_of_ed', 6],
      ['detect_site_bool', 7],
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

      if ('age_from' in payload) payload.age_from = toIntOrNull(payload.age_from as any);
      if ('age_to' in payload) payload.age_to = toIntOrNull(payload.age_to as any);
      if ('monitor' in payload && (payload as any).monitor === '') (payload as any).monitor = null;

      delete (payload as any).id;
      Object.keys(payload).forEach((k) => {
        if ((payload as any)[k] === undefined) delete (payload as any)[k];
      });

      const res = await fetch(`${API_BASE}/centers/${row.original.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text());

      toast.success(`✅ Updated: ${values.name ?? row.original.name ?? row.original.id}`);
      await fetchData();
      exitEditingMode();
    } catch (e) {
      console.error(e);
      toast.error('❌ Error updating center');
    }
  };

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

  async function ensureStdColumns() {
    try {
      const res = await fetch(`/api/admin/add-schema`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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

                {/* NUEVO: Re-geocodificar todos los que faltan */}
                <button
                  onClick={async () => {
                    try {
                      const res = await fetch('/api/admin/regeo-missing', { method: 'POST' });
                      const js = await res.json();
                      if (!res.ok) throw new Error(JSON.stringify(js));
                      toast.success(`Re-geocoded: ${js.attempted} centers`);
                      await fetchData();
                    } catch (e: any) {
                      console.error(e);
                      toast.error('❌ Re-geocode failed');
                    }
                  }}
                  className="px-3 py-2 rounded-md bg-emerald-600 text-white hover:bg-emerald-700 text-sm"
                  title="Re-geocode all centers without coordinates"
                >
                  Re-geocode missing
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

                  {/* NUEVO: Verify (usa tu /api/geocoding/verify) */}
                  <button
                    onClick={async () => {
                      const c = row.original as any;
                      try {
                        const r = await fetch('/api/geocoding/verify', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            address:  c.address  ?? '',
                            city:     c.city     ?? '',
                            zip_code: c.zip_code ?? '',
                            country:  c.country  ?? '',
                          }),
                        });
                        const j = await r.json();
                        if (!r.ok) throw new Error(JSON.stringify(j));
                        const status = j.status || j.error || 'OK';
                        const msg =
                          (j.partial ? 'Partial match. ' : '') +
                          (j.formatted_address ? `→ ${j.formatted_address}` : '');
                        toast((t) => (
                          <span>
                            <b>Verify:</b> {status} {msg && <i>{msg}</i>}
                          </span>
                        ));
                      } catch (e: any) {
                        console.error(e);
                        toast.error('❌ Verify failed');
                      }
                    }}
                    className="px-2 py-1 text-sm bg-gray-100 rounded hover:bg-gray-200"
                  >
                    Verify
                  </button>

                  {/* NUEVO: Forzar re-geo de esa fila */}
                  <button
                    onClick={async () => {
                      const c = row.original as any;
                      try {
                        const res = await fetch(`${API_BASE}/centers/${c.id}`, {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            address:  c.address  ?? '',
                            city:     c.city     ?? '',
                            zip_code: c.zip_code ?? '',
                            country:  c.country  ?? '',
                          }),
                        });
                        const js = await res.json().catch(() => ({}));
                        if (!res.ok) throw new Error(JSON.stringify(js));
                        toast.success('✅ Forced re-geocode');
                        await fetchData();
                      } catch (e: any) {
                        console.error(e);
                        toast.error('❌ Force re-geo failed');
                      }
                    }}
                    className="px-2 py-1 text-sm bg-emerald-600 text-white rounded hover:bg-emerald-700"
                  >
                    Force re-geo
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

            <AddColumnModal
              open={addColOpen}
              onClose={() => setAddColOpen(false)}
              table="clinical_centers"
              onSuccess={refreshAll}
            />
            {tab === 'centers' && (
              <Link
                href="/sites/create"
                aria-label="Register new clinical center"
                title="Register new clinical center"
                className="fixed right-5 bottom-5 md:right-8 md:bottom-8 z-50"
              >
                <span className="flex items-center gap-2 rounded-full shadow-lg bg-inodia-blue text-white px-5 py-3 hover:bg-blue-700 transition">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                  <span className="hidden sm:inline text-sm font-medium">New Center</span>
                </span>
              </Link>
            )}
          </>
        ) : (
          <ProgramRulesEditor />
        )}
      </div>
    </div>
  );
}