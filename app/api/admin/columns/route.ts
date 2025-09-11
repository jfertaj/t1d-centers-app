// app/api/admin/columns/route.ts
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  try {
    const base = process.env.NEXT_PUBLIC_API_BASE;
    const adminToken = process.env.ADMIN_TOKEN || '';
    if (!base || !adminToken) {
      return NextResponse.json(
        { error: 'Missing NEXT_PUBLIC_API_BASE or ADMIN_TOKEN' },
        { status: 500 }
      );
    }
    const { searchParams } = new URL(req.url);
    const table = searchParams.get('table') || 'clinical_centers';

    const resp = await fetch(`${base}/admin/columns?table=${encodeURIComponent(table)}`, {
      headers: { 'X-Admin-Token': adminToken },
      cache: 'no-store',
    });

    const text = await resp.text();
    let data: any;
    try { data = JSON.parse(text); } catch { data = { message: text }; }

    return NextResponse.json(data, { status: resp.status });
  } catch (e: any) {
    return NextResponse.json({ error: 'Proxy error', details: String(e?.message || e) }, { status: 500 });
  }
}