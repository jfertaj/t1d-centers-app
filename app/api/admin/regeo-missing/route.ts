// src/app/api/admin/regeo-missing/route.ts
import { NextResponse } from 'next/server';
import { forwardAuth } from '@lib/adminToken';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const base = process.env.NEXT_PUBLIC_API_BASE;
    const adminToken = process.env.ADMIN_TOKEN || process.env.NEXT_PUBLIC_ADMIN_TOKEN || '';

    if (!base) {
      return NextResponse.json({ error: 'Missing environment variable: NEXT_PUBLIC_API_BASE' }, { status: 500 });
    }
    if (!adminToken) {
      return NextResponse.json({ error: 'Missing environment variable: ADMIN_TOKEN' }, { status: 500 });
    }

    const upstream = await fetch(`${base}/admin/regeo-missing`, {
      method: 'POST',
      headers: { ...forwardAuth(req),
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