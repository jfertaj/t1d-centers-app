// app/api/admin/add-columns/route.ts
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const base = process.env.NEXT_PUBLIC_API_BASE;
    // Intentar leer ambas variables para máxima compatibilidad
    const adminToken = process.env.ADMIN_TOKEN || process.env.NEXT_PUBLIC_ADMIN_TOKEN || '';

    if (!base) {
      return NextResponse.json({ error: 'Missing environment variable: NEXT_PUBLIC_API_BASE' }, { status: 500 });
    }
    if (!adminToken) {
      return NextResponse.json({ error: 'Missing environment variable: ADMIN_TOKEN' }, { status: 500 });
    }

    const body = await req.json();

    const resp = await fetch(`${base}/admin/add-columns`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Token': adminToken,
      },
      body: JSON.stringify(body),
    });

    const text = await resp.text();
    let data: unknown;
    try { data = JSON.parse(text); } catch { data = { message: text }; }

    return NextResponse.json(data, { status: resp.status });
  } catch (e: any) {
    return NextResponse.json(
      { error: 'Proxy error', details: String(e?.message || e) },
      { status: 500 }
    );
  }
}