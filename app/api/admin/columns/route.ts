// app/api/admin/columns/route.ts
import { NextResponse, NextRequest } from 'next/server';

export const runtime = 'nodejs';

// Proxy de lectura de metadatos de columnas (no requiere token)
export async function GET(req: NextRequest) {
  try {
    const base = process.env.NEXT_PUBLIC_API_BASE;
    if (!base) {
      return NextResponse.json(
        { error: 'Missing NEXT_PUBLIC_API_BASE' },
        { status: 500 }
      );
    }
    const table = req.nextUrl.searchParams.get('table') || '';
    if (!table) {
      return NextResponse.json(
        { error: 'Query param "table" is required' },
        { status: 400 }
      );
    }

    const upstream = await fetch(
      `${base}/admin/columns?table=${encodeURIComponent(table)}`,
      { method: 'GET', cache: 'no-store' }
    );

    // Intenta JSON; si no, devuelve texto envuelto
    const text = await upstream.text();
    let data: any;
    try { data = JSON.parse(text); } catch { data = { message: text }; }

    return NextResponse.json(data, { status: upstream.status });
  } catch (e: any) {
    return NextResponse.json(
      { error: 'Proxy error', details: String(e?.message || e) },
      { status: 500 }
    );
  }
}