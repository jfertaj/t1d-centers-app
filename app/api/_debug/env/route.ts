// app/api/_debug/env/route.ts
import { NextResponse } from 'next/server';
export const runtime = 'nodejs'; // asegura runtime Node

export async function GET() {
  // No exponemos secretos, solo si están presentes
  return NextResponse.json(
    {
      NODE_ENV: process.env.NODE_ENV,
      PGHOST: !!process.env.PGHOST,
      PGPORT: !!process.env.PGPORT,
      PGDATABASE: !!process.env.PGDATABASE,
      PGUSER: !!process.env.PGUSER,
      PGPASSWORD: !!process.env.PGPASSWORD,
      PGSSLMODE: process.env.PGSSLMODE ?? null,
    },
    { status: 200 }
  );
}