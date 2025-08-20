// app/api/debug/db-info/route.ts
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE!; // p.ej. https://.../prod/t1d-centers-proxy

export async function GET() {
  try {
    const res = await fetch(`${API_BASE}/health`, { method: 'GET' });
    const json = await res.json().catch(() => null);
    return NextResponse.json(
      { ok: res.ok, status: res.status, api: API_BASE, data: json },
      { status: res.ok ? 200 : 500 },
    );
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, api: API_BASE, error: String(e) },
      { status: 500 },
    );
  }
}