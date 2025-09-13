// src/app/api/admin/regeo-missing/route.ts
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST() {
  try {
    const base = process.env.NEXT_PUBLIC_API_BASE;
    const adminToken = process.env.ADMIN_TOKEN || '';

    if (!base || !adminToken) {
      return NextResponse.json(
        { error: 'Missing NEXT_PUBLIC_API_BASE or ADMIN_TOKEN' },
        { status: 500 }
      );
    }

    const upstream = await fetch(`${base}/admin/regeo-missing`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Token': adminToken,
      },
      // opcionalmente podrías enviar {limit: N} en body para lotes
      body: JSON.stringify({}),
    });

    const txt = await upstream.text();
    let json: any;
    try { json = JSON.parse(txt); } catch { json = { message: txt }; }

    return NextResponse.json(json, { status: upstream.status });
  } catch (e: any) {
    return NextResponse.json(
      { error: 'Proxy error', details: String(e?.message || e) },
      { status: 500 }
    );
  }
}