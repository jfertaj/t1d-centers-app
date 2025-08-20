// lib/db.ts
import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';

let pool: Pool | null = null;

function readSslConfig() {
  const mode = (process.env.PGSSLMODE || '').toLowerCase();
  if (!mode || mode === 'disable' || mode === 'off' || mode === 'false') {
    return undefined; // sin SSL
  }

  // Lee el CA desde la env (ya la tienes configurada en Amplify)
  const certPath = process.env.PGSSLROOTCERT || 'certs/global-bundle.pem';
  const abs = path.isAbsolute(certPath)
    ? certPath
    : path.join(process.cwd(), certPath.replace(/^\.\//, ''));

  let ca: string | undefined;
  try {
    ca = fs.readFileSync(abs, 'utf8');
  } catch (e) {
    // Si no encuentra el CA, al menos pide verificación del cert del servidor
    return { rejectUnauthorized: true } as const;
  }
  return { rejectUnauthorized: true, ca } as const;
}

export function getPool() {
  if (pool) return pool;

  pool = new Pool({
    host: process.env.PGHOST,
    port: Number(process.env.PGPORT || 5432),
    database: process.env.PGDATABASE,
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    ssl: readSslConfig(),
    max: 4,
    idleTimeoutMillis: 30_000,
  });

  pool.on('error', (err) => {
    console.error('PG pool error:', err);
  });

  return pool;
}