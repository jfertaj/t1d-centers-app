// app/api/program-rules/create/route.ts
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const base = process.env.NEXT_PUBLIC_API_BASE;
    if (!base) {
      return NextResponse.json(
        { error: 'Missing NEXT_PUBLIC_API_BASE' },
        { status: 500 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const resp = await fetch(`${base}/program-rules`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

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