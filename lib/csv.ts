// lib/csv.ts
// CSV export shared by admin pages: UTF-8 BOM so Excel reads accented names,
// and neutralised formula prefixes (=, +, -, @) so a cell can't run in Excel.
// Same rules as the exports in AdminCenterEditorB and ProgramRulesEditor.

const isPlainNumber = (s: string) => /^[+-]?\d+(\.\d+)?([eE][+-]?\d+)?$/.test(s);

export function escapeCsvField(raw: unknown): string {
  let s = raw == null ? '' : String(raw);
  if (/^[\x00-\x20]*[=+\-@]/.test(s) && !isPlainNumber(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function downloadCsv(filename: string, header: string[], rows: unknown[][]): void {
  const csv = [header, ...rows].map((r) => r.map(escapeCsvField).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: filename });
  a.click();
  URL.revokeObjectURL(url);
}
