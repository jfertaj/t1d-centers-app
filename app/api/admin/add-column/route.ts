// app/api/admin/add-column/route.ts
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const base = process.env.NEXT_PUBLIC_API_BASE;
    // Usa un token de admin *del servidor* si lo tienes configurado
    const adminToken = process.env.ADMIN_TOKEN || process.env.NEXT_PUBLIC_ADMIN_TOKEN || '';
    if (!base) {
      return NextResponse.json({ error: 'NEXT_PUBLIC_API_BASE is not set' }, { status: 500 });
    }
    if (!adminToken) {
      return NextResponse.json({ error: 'ADMIN_TOKEN is not set' }, { status: 500 });
    }

    const body = await req.json();

    // OJO: el endpoint real en Lambda es /admin/add-columns (plural)
    const upstream = await fetch(`${base}/admin/add-columns`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Token': adminToken,
      },
      body: JSON.stringify(body),
    });

    const text = await upstream.text();
    let json: any;
    try { json = JSON.parse(text); } catch { json = { message: text }; }

    return NextResponse.json(json, { status: upstream.status });
  } catch (e: any) {
    return NextResponse.json({ error: 'Proxy error', details: String(e?.message || e) }, { status: 500 });
  }
}