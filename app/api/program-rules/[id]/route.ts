// app/api/program-rules/[id]/route.ts
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const base = process.env.NEXT_PUBLIC_API_BASE!;
    const body = await req.json();
    const res = await fetch(`${base}/program-rules/${params.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch (e: any) {
    return NextResponse.json({ error: 'Upstream error', details: String(e?.message || e) }, { status: 502 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const base = process.env.NEXT_PUBLIC_API_BASE!;
    const res = await fetch(`${base}/program-rules/${params.id}`, { method: 'DELETE' });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch (e: any) {
    return NextResponse.json({ error: 'Upstream error', details: String(e?.message || e) }, { status: 502 });
  }
}