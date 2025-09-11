// app/api/program-rules/list/route.ts
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

// GET /api/program-rules/list?country=...&active=true|false
export async function GET(req: Request) {
  const base = process.env.NEXT_PUBLIC_API_BASE;
  if (!base) {
    return NextResponse.json({ error: 'NEXT_PUBLIC_API_BASE is not set' }, { status: 500 });
  }

  const url = new URL(req.url);
  const qs = url.searchParams.toString();
  const target = `${base}/program-rules${qs ? `?${qs}` : ''}`;

  try {
    const upstream = await fetch(target, { method: 'GET', cache: 'no-store' });
    const text = await upstream.text();
    let data: any;
    try { data = JSON.parse(text); } catch { data = { message: text }; }
    // La Lambda devuelve array de reglas
    return NextResponse.json(Array.isArray(data) ? data : [], { status: upstream.status });
  } catch (e: any) {
    return NextResponse.json({ error: 'Proxy error', details: String(e?.message || e) }, { status: 500 });
  }
}