// lib/db.ts
import { Pool } from 'pg';
import { readFileSync } from 'fs';
import path from 'path';

const sslCa = readFileSync(path.join(process.cwd(), 'certs', 'global-bundle.pem')).toString();

export const pool = new Pool({
  user: process.env.PGUSER,
  host: process.env.PGHOST,
  database: process.env.PGDATABASE,
  password: process.env.PGPASSWORD,
  port: Number(process.env.PGPORT || 5432),
  ssl: {
    rejectUnauthorized: true,
    ca: sslCa,
  },
});