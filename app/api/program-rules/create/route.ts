import { NextResponse } from 'next/server';
import { apiFetch } from '@lib/api';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const created = await apiFetch('/program-rules', { method: 'POST', body });
    return NextResponse.json(created, { status: 201 });
  } catch (err: any) {
    console.error('rules create error:', err);
    return NextResponse.json({ error: 'Upstream error' }, { status: 502 });
  }
}