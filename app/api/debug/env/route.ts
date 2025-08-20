// app/api/_debug/env/route.ts (versión más limpia)
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET() {
  return NextResponse.json(
    {
      NODE_ENV: process.env.NODE_ENV,
      NEXT_PUBLIC_API_BASE: !!process.env.NEXT_PUBLIC_API_BASE,
    },
    { status: 200 },
  );
}