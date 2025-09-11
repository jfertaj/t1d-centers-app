import { NextResponse } from 'next/server';
import { apiFetch } from '@lib/api';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const data = await apiFetch('/program-rules', { method: 'GET' });
    return NextResponse.json(Array.isArray(data) ? data : data?.rules ?? []);
  } catch (err: any) {
    console.error('rules list error:', err);
    return NextResponse.json({ error: 'Upstream error' }, { status: 502 });
  }
}