// app/api/admin/columns/route.ts
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

// GET /api/admin/columns?table=clinical_centers
export async function GET(req: Request) {
  const base = process.env.NEXT_PUBLIC_API_BASE;
  if (!base) {
    return NextResponse.json({ error: 'NEXT_PUBLIC_API_BASE is not set' }, { status: 500 });
  }

  const url = new URL(req.url);
  const table = url.searchParams.get('table') || 'clinical_centers';

  try {
    const upstream = await fetch(`${base}/admin/columns?table=${encodeURIComponent(table)}`, {
      // ← este endpoint en Lambda **no** requiere token
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    });

    const text = await upstream.text();
    let data: any;
    try { data = JSON.parse(text); } catch { data = { message: text }; }

    return NextResponse.json(data, { status: upstream.status });
  } catch (e: any) {
    return NextResponse.json({ error: 'Proxy error', details: String(e?.message || e) }, { status: 500 });
  }
}