// app/api/admin/stats/route.ts
import { NextResponse } from 'next/server';
import { apiFetch } from '@lib/api';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const stats = await apiFetch('/admin/stats', {
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