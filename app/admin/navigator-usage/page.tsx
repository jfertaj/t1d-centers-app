// app/admin/navigator-usage/page.tsx
// Usage report of the public Early T1D Navigator. Guarded by app/admin/layout.tsx.
'use client';

import { useEffect, useState } from 'react';
import { authFetch } from '@lib/authFetch';
import { downloadCsv } from '@lib/csv';

const COLUMNS = [
  { key: 'visits', label: 'Visits', group: 'Traffic' },
  { key: 'from_innodia', label: 'via innodia.org', group: 'Traffic' },
  { key: 'from_direct', label: 'Direct', group: 'Traffic' },
  { key: 'from_search_engine', label: 'Search engines', group: 'Traffic' },
  { key: 'from_other', label: 'Other sites', group: 'Traffic' },
  { key: 'explore_clicks', label: '"Explore Sites" clicked', group: 'Explore Sites' },
  { key: 'explore_results', label: 'Saw results', group: 'Explore Sites' },
  { key: 'search_clicks', label: '"Start search" clicked', group: 'Start search' },
  { key: 'search_with_diagnosis', label: 'With diagnosis', group: 'Start search' },
  { key: 'search_without_diagnosis', label: 'Without diagnosis', group: 'Start search' },
  { key: 'search_location_entered', label: 'Entered location', group: 'Start search' },
  { key: 'search_results', label: 'Saw sites / programmes', group: 'Start search' },
  { key: 'search_no_results', label: 'Nothing in country', group: 'Start search' },
  { key: 'search_age_not_eligible', label: 'Not eligible (age)', group: 'Start search' },
  { key: 'contact_sent', label: 'Sent contact form', group: 'Start search' },
] as const;

type MonthRow = { month: string } & Record<(typeof COLUMNS)[number]['key'], number>;
type CountryRow = { flow: 'explore' | 'search'; country: string; visits: number };
type CampaignRow = { utm_source: string; visits: number };
type Usage = { months: MonthRow[]; countries: CountryRow[]; campaigns: CampaignRow[] };

function exportMonths(months: MonthRow[]) {
  downloadCsv(
    'navigator-usage.csv',
    ['Month', ...COLUMNS.map((c) => `${c.group}: ${c.label}`)],
    months.map((m) => [m.month, ...COLUMNS.map((c) => m[c.key])]),
  );
}

function MonthlyTable({ months }: { months: MonthRow[] }) {
  const totals = COLUMNS.map((c) => months.reduce((s, m) => s + m[c.key], 0));
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm bg-white border rounded-xl">
        <thead className="bg-inodia-blue text-white">
          <tr>
            <th className="px-3 py-2 text-left">Month</th>
            {COLUMNS.map((c) => (
              <th key={c.key} className="px-3 py-2 text-right font-medium">
                <div className="text-[10px] uppercase opacity-80">{c.group}</div>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {months.map((m) => (
            <tr key={m.month} className="odd:bg-gray-50">
              <td className="px-3 py-2 border-b font-medium">{m.month}</td>
              {COLUMNS.map((c) => <td key={c.key} className="px-3 py-2 text-right border-b">{m[c.key]}</td>)}
            </tr>
          ))}
          <tr className="font-bold bg-blue-50">
            <td className="px-3 py-2">Total</td>
            {totals.map((t, i) => <td key={COLUMNS[i].key} className="px-3 py-2 text-right">{t}</td>)}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function RankedList({ title, rows, empty }: { title: string; rows: { label: string; n: number }[]; empty: string }) {
  return (
    <div className="bg-white p-5 rounded-xl shadow border">
      <h2 className="font-semibold text-inodia-blue mb-3">{title}</h2>
      {rows.length === 0 ? <p className="text-sm text-gray-500">{empty}</p> : (
        <ul className="text-sm divide-y">
          {rows.slice(0, 20).map(({ label, n }) => (
            <li key={label} className="flex justify-between py-1"><span>{label}</span><span className="font-medium">{n}</span></li>
          ))}
        </ul>
      )}
    </div>
  );
}

const byCountry = (rows: CountryRow[], flow: CountryRow['flow']) =>
  rows.filter((r) => r.flow === flow).map((r) => ({ label: r.country, n: r.visits }));

function Report({ usage }: { usage: Usage }) {
  if (usage.months.length === 0) {
    return <p className="text-gray-600">No visits recorded yet. Counting starts when the navigator update is live.</p>;
  }
  return (
    <>
      <MonthlyTable months={usage.months} />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <RankedList title="Countries — Explore Sites" rows={byCountry(usage.countries, 'explore')} empty="No data yet." />
        <RankedList title="Countries — Start search" rows={byCountry(usage.countries, 'search')} empty="No data yet." />
        <RankedList
          title="Campaigns (utm_source)"
          rows={usage.campaigns.map((c) => ({ label: c.utm_source, n: c.visits }))}
          empty="No tagged links used yet. Add ?utm_source=newsletter (or linkedin, qr, pdf, flyer, conference…; the list is in app/navigatorEvents.mjs) to links in emails, PDFs and QR codes. Unknown names are counted as 'other'."
        />
      </div>
    </>
  );
}

export default function NavigatorUsagePage() {
  const [usage, setUsage] = useState<Usage | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    authFetch('/api/admin/navigator-usage')
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body?.error || `HTTP ${res.status}`);
        setUsage(body);
      })
      .catch((err) => setError(String(err?.message || err)));
  }, []);

  return (
    <div className="container-box-wide mt-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-inodia-blue">Early T1D Navigator usage</h1>
          <p className="text-sm text-gray-600 mt-1">
            Anonymous counts from innodia-t1d-navigator.org. Each number is a number of visits (page loads), not clicks.
            Staff browsers marked with <code>?internal=1</code> are excluded.
          </p>
        </div>
        {usage && usage.months.length > 0 && (
          <button onClick={() => exportMonths(usage.months)} className="button-blue">Download CSV</button>
        )}
      </div>
      {error && <p className="text-red-600">Could not load usage: {error}</p>}
      {!usage && !error && <p className="text-gray-600">Loading…</p>}
      {usage && <Report usage={usage} />}
    </div>
  );
}
