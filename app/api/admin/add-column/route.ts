// app/api/admin/add-column/route.ts
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const apiBase = process.env.NEXT_PUBLIC_API_BASE;
    if (!apiBase) {
      return NextResponse.json({ error: 'NEXT_PUBLIC_API_BASE is not set' }, { status: 500 });
    }
    const body = await req.json();

    // Proxy hacia la Lambda
    const upstream = await fetch(`${apiBase}/admin/add-column`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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