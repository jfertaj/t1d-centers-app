// app/api/test-db/route.ts
import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import { readFileSync } from 'fs';
import path from 'path';

const caCertPath = path.resolve(process.cwd(), 'certs/global-bundle.pem');

const pool = new Pool({
  user: process.env.PGUSER,
  host: process.env.PGHOST,
  database: process.env.PGDATABASE,
  password: process.env.PGPASSWORD,
  port: Number(process.env.PGPORT || 5432),
  ssl: {
    rejectUnauthorized: true,
    ca: readFileSync(caCertPath).toString(),
  },
});

export async function GET() {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    client.release();

    return NextResponse.json({ status: '✅ Connected to DB', time: result.rows[0].now });
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    return NextResponse.json(
      { error: 'Database connection failed', details: String(error) },
      { status: 500 }
    );
  }
}