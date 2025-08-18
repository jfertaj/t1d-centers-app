import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export async function GET() {
  try {
    const { rows } = await pool.query('SELECT COUNT(*)::int AS count FROM clinical_centers;');
    return NextResponse.json({
      ok: true,
      count: rows[0]?.count ?? 0,
      db: process.env.PGDATABASE,
      host: process.env.PGHOST,
      user: process.env.PGUSER?.slice(0, 2) + '***', // no filtrar secretos
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}