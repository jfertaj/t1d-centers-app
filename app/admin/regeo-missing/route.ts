// app/api/admin/regeo-missing/route.ts
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Re-geocodifica (forzado) todos los centros que no tienen latitude/longitude
 * usando tu Lambda:
 *   1) GET /centers
 *   2) Para cada centro sin lat/lng → PUT /centers/:id con address/city/zip/country
 */
export async function POST() {
  try {
    const base = process.env.NEXT_PUBLIC_API_BASE;
    if (!base) {
      return NextResponse.json(
        { ok: false, error: 'Missing NEXT_PUBLIC_API_BASE' },
        { status: 500 },
      );
    }

    const listRes = await fetch(`${base}/centers`, { cache: 'no-store' });
    if (!listRes.ok) {
      return NextResponse.json(
        { ok: false, error: `Upstream list failed ${listRes.status}` },
        { status: listRes.status },
      );
    }

    const centers = await listRes.json().catch(() => []);
    const targets = (centers || []).filter(
      (c: any) => c.latitude == null || c.longitude == null
    );

    const results: any[] = [];
    for (const c of targets) {
      const payload = {
        address:  c.address  ?? '',
        city:     c.city     ?? '',
        zip_code: c.zip_code ?? '',
        country:  c.country  ?? '',
      };

      const r = await fetch(`${base}/centers/${c.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify(payload),
      });

      let data: any = null;
      try { data = await r.json(); } catch {}
      results.push({ id: c.id, ok: r.ok, status: r.status, data });
    }

    return NextResponse.json({ ok: true, attempted: results.length, results });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: 'Proxy error', details: String(e?.message || e) },
      { status: 500 },
    );
  }
}