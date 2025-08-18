// app/api/_debug/env/route.ts
import { NextResponse } from 'next/server';

export async function GET() {
  // NUNCA expongas secretos; solo mostramos qué vars "existen"
  const visible = {
    NODE_ENV: process.env.NODE_ENV,
    PGHOST: !!process.env.PGHOST,
    PGPORT: !!process.env.PGPORT,
    PGDATABASE: !!process.env.PGDATABASE,
    PGUSER: !!process.env.PGUSER,
    PGPASSWORD: !!process.env.PGPASSWORD,
    PGSSLMODE: process.env.PGSSLMODE,
  };
  return NextResponse.json(visible, { status: 200 });
}