// app/api/_debug/db-info/route.ts
import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export async function GET() {
  try {
    // ping sencillo + muestra a qué host cree que conecta
    const { rows } = await pool.query('select now() as now');
    return NextResponse.json(
      { ok: true, now: rows[0]?.now, host: process.env.PGHOST },
      { status: 200 },
    );
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: String(err), host: process.env.PGHOST },
      { status: 500 },
    );
  }
}