'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';

type Props = {
  open: boolean;
  onClose: () => void;
  table?: string;            // por defecto clinical_centers
  onSuccess?: () => void;    // callback tras crear
};

const TYPE_OPTIONS = [
  { key: 'TEXT', label: 'Text' },
  { key: 'INTEGER', label: 'Integer' },
  { key: 'DOUBLE PRECISION', label: 'Double' },
  { key: 'BOOLEAN', label: 'Boolean' },
  { key: 'DATE', label: 'Date' },
  { key: 'TIMESTAMP', label: 'Timestamp' },
];

function slugifyToColumn(raw: string) {
  // snake_case solo con letras, números y guiones bajos, empieza por letra
  let s = (raw || '').trim().toLowerCase();
  s = s.normalize('NFD').replace(/[\u0300-\u036f]/g, ''); // sin acentos
  s = s.replace(/[^a-z0-9]+/g, '_');                     // no alfanumérico -> _
  s = s.replace(/^_+|_+$/g, '').replace(/_{2,}/g, '_');  // bordes y dobles
  if (!/^[a-z]/.test(s)) s = `c_${s}`;                   // que empiece por letra
  return s.slice(0, 63);                                  // límite típico
}

export default function AddColumnModal({ open, onClose, table = 'clinical_centers', onSuccess }: Props) {
  const [label, setLabel] = useState('');
  const [colName, setColName] = useState('');
  const [type, setType] = useState('TEXT');
  const [nullable, setNullable] = useState(true);
  const [defValue, setDefValue] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const onLabelBlur = () => {
    if (!colName && label) setColName(slugifyToColumn(label));
  };

  const composeDefaultClause = () => {
    if (!defValue) return undefined;
    // quoting sencillo por tipo
    if (type === 'BOOLEAN') {
      const v = String(defValue).toLowerCase();
      if (v === 'true' || v === 'false') return v.toUpperCase();
      return undefined;
    }
    if (type === 'INTEGER' || type === 'DOUBLE PRECISION') {
      const n = Number(defValue);
      if (Number.isFinite(n)) return String(n);
      return undefined;
    }
    // funciones como NOW() o CURRENT_DATE se aceptan tal cual
    if (/^\s*[A-Z_]+\(\)\s*$/.test(defValue) || /^\s*CURRENT(_DATE|_TIMESTAMP)?\s*$/.test(defValue)) {
      return defValue.trim();
    }
    // cadenas con comillas simples escapadas
    const escaped = String(defValue).replace(/'/g, "''");
    return `'${escaped}'`;
  };

  const submit = async () => {
    const safeName = slugifyToColumn(colName || label);
    if (!safeName) {
      toast.error('Column name is required');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        table,
        columns: [
          {
            name: safeName,
            type,
            nullable,
            default: composeDefaultClause(), // puede ser undefined
          },
        ],
      };

      const res = await fetch('/api/admin/add-column', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error(await res.text());
      toast.success(`Column "${safeName}" added/ensured`);
      onSuccess?.();
      onClose();
      // reset
      setLabel(''); setColName(''); setType('TEXT'); setNullable(true); setDefValue('');
    } catch (e: any) {
      toast.error(e?.message || 'Failed adding column');
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-lg">
        <h3 className="text-lg font-semibold mb-4">Add column to <span className="font-mono">{table}</span></h3>

        <div className="space-y-3">
          <div>
            <label className="block text-sm text-gray-700 mb-1">Label (human-friendly)</label>
            <input
              className="w-full rounded-md border px-3 py-2"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              onBlur={onLabelBlur}
              placeholder="e.g., Enrollment date"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1">Column name (snake_case)</label>
            <input
              className="w-full rounded-md border px-3 py-2 font-mono"
              value={colName}
              onChange={(e) => setColName(slugifyToColumn(e.target.value))}
              placeholder="enrollment_date"
            />
            <p className="text-xs text-gray-500 mt-1">Solo letras, números y “_”. Máx 63 chars. Debe empezar por letra.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-sm text-gray-700 mb-1">Type</label>
              <select
                className="w-full rounded-md border px-3 py-2 bg-white"
                value={type}
                onChange={(e) => setType(e.target.value)}
              >
                {TYPE_OPTIONS.map(o => (
                  <option key={o.key} value={o.key}>{o.label}</option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <label className="inline-flex items-center gap-2 text-sm">
                <input type="checkbox" checked={nullable} onChange={(e) => setNullable(e.target.checked)} />
                Nullable
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-700 mb-1">Default (opcional)</label>
            <input
              className="w-full rounded-md border px-3 py-2 font-mono"
              value={defValue}
              onChange={(e) => setDefValue(e.target.value)}
              placeholder={`Ej.: true | 0 | NOW() | CURRENT_DATE | 'MISSING'`}
            />
            <p className="text-xs text-gray-500 mt-1">
              Para funciones usa <code className="font-mono">NOW()</code>, <code className="font-mono">CURRENT_DATE</code>, etc.
              Cadenas irán entre comillas simples.
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button onClick={onClose} className="px-4 py-2 rounded-md border" disabled={submitting}>Cancel</button>
          <button
            onClick={submit}
            disabled={submitting}
            className="px-4 py-2 rounded-md bg-inodia-blue text-white disabled:opacity-60"
          >
            {submitting ? 'Adding…' : 'Add column'}
          </button>
        </div>
      </div>
    </div>
  );
}