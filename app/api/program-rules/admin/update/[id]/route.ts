import { NextResponse } from 'next/server';
import { apiFetch } from '@lib/api';

export const runtime = 'nodejs';

export async function PUT(req: Request) {
  try {
    const url = new URL(req.url);
    const id = Number(url.pathname.split('/').filter(Boolean).pop());
    if (!Number.isFinite(id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

    const body = await req.json();
    const updated = await apiFetch(`/program-rules/${id}`, { method: 'PUT', body });
    return NextResponse.json(updated, { status: 200 });
  } catch (err: any) {
    console.error('rules update error:', err);
    return NextResponse.json({ error: 'Upstream error' }, { status: 502 });
  }
}