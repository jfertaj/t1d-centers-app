// lib/db.ts
import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';

let ca: string | undefined;
try {
  // solo si usas SSL
  ca = fs.readFileSync(path.join(process.cwd(), 'certs', 'global-bundle.pem'), 'utf8');
} catch {}

export const pool = new Pool({
  user: process.env.PGUSER,
  host: process.env.PGHOST,           // usa el endpoint del RDS Proxy
  database: process.env.PGDATABASE,
  password: process.env.PGPASSWORD,
  port: Number(process.env.PGPORT ?? 5432),
  ssl: process.env.PGSSLMODE ? { rejectUnauthorized: true, ca } : undefined,
  max: 4,                 // pequeño pool para serverless
  idleTimeoutMillis: 30000,
});