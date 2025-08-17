// app/api/sites/list/route.ts
import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';

// 📁 Cargar certificado SSL para AWS RDS (usualmente en certs/global-bundle.pem)
let sslCert: string;
try {
  sslCert = fs.readFileSync(
    path.join(process.cwd(), 'certs', 'global-bundle.pem'),
    'utf8'
  );
} catch (err) {
  console.error('❌ Could not read SSL certificate:', err);
  throw new Error('Missing or unreadable SSL certificate');
}

const pool = new Pool({
  user: process.env.PGUSER,
  host: process.env.PGHOST,
  database: process.env.PGDATABASE,
  password: process.env.PGPASSWORD,
  port: Number(process.env.PGPORT || 5432),
  ssl: {
    rejectUnauthorized: true,
    ca: sslCert,
  },
});

export async function GET() {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT * FROM clinical_centers ORDER BY created_at DESC');
    client.release();

    return NextResponse.json({ centers: result.rows });
  } catch (error) {
    console.error('❌ Error fetching centers:', error);
    return NextResponse.json(
      {
        error: 'Database connection failed',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}