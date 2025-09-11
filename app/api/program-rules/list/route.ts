// app/api/program-rules/list/route.ts
import { NextResponse, NextRequest } from 'next/server';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const base = process.env.NEXT_PUBLIC_API_BASE;
    if (!base) {
      return NextResponse.json(
        { error: 'Missing NEXT_PUBLIC_API_BASE' },
        { status: 500 }
      );
    }

    const u = new URL(`${base}/program-rules`);
    // Reenvía query params opcionales (country, active)
    for (const [k, v] of req.nextUrl.searchParams.entries()) {
      u.searchParams.set(k, v);
    }

    const resp = await fetch(u.toString(), { method: 'GET', cache: 'no-store' });
    const text = await resp.text();
    let data: any;
    try { data = JSON.parse(text); } catch { data = { message: text }; }

    return NextResponse.json(data, { status: resp.status });
  } catch (e: any) {
    return NextResponse.json(
      { error: 'Proxy error', details: String(e?.message || e) },
      { status: 500 }
    );
  }
}