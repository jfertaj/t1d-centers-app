// app/api/admin/navigator-usage/route.ts
// Monthly usage of the public Early T1D Navigator (anonymous events).
// Passes the upstream status through so a 401 still ends a dead session.
import { NextResponse } from 'next/server';
import { forwardAuth } from '@lib/adminToken';
import { API_BASE } from '@lib/api';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  try {
    const res = await fetch(`${API_BASE}/admin/navigator-stats`, {
      headers: forwardAuth(req),
      cache: 'no-store',
    });
    const body = await res.json().catch(() => ({ error: 'Invalid upstream response' }));
    return NextResponse.json(body, { status: res.status });
  } catch (err) {
    console.error('Navigator usage proxy failed:', err);
    return NextResponse.json({ error: 'Failed to fetch navigator usage' }, { status: 502 });
  }
}
