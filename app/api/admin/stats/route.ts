// app/api/admin/stats/route.ts
import { NextResponse } from 'next/server';
import { forwardAuth } from '@lib/adminToken';
import { apiFetch } from '@lib/api';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  try {
    const stats = await apiFetch('/admin/stats', {
      headers: forwardAuth(req),
      method: 'GET',
    });
    return NextResponse.json(stats, { status: 200 });
  } catch (err: any) {
    console.error('❌ Error proxying admin stats:', err);
    return NextResponse.json(
      { error: 'Failed to fetch stats', details: err?.message ?? String(err) },
      { status: 502 }
    );
  }
}