// app/api/_debug/db-info/route.ts
import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
export const runtime = 'nodejs'; // asegura runtime Node

export async function GET() {
  try {
    const r = await pool.query('select now() as now');
    return NextResponse.json({ ok: true, now: r.rows[0]?.now, host: process.env.PGHOST }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, message: err?.message ?? String(err), code: err?.code ?? null, host: process.env.PGHOST },
      { status: 500 }
    );
  }
}