// app/api/sites/list/route.ts
import { NextResponse } from 'next/server';
import { apiFetch } from '@lib/api'; // nuestro helper que apunta a API Gateway

export const runtime = 'nodejs';

export async function GET() {
  try {
    // Llama a tu Lambda (API Gateway) → /centers
    const centers = await apiFetch('/centers', { method: 'GET' });

    // Devuelve la lista de centros directamente
    return NextResponse.json(centers, { status: 200 });
  } catch (err: any) {
    console.error('❌ /api/sites/list proxy error:', err);
    return NextResponse.json(
      {
        error: 'Upstream error',
        details: err?.message ?? String(err),
      },
      { status: 502 },
    );
  }
}



// // app/api/sites/list/route.ts
// import { NextResponse } from 'next/server';
// import { Pool } from 'pg';
// import fs from 'fs';
// import path from 'path';

// // 📁 Cargar certificado SSL para AWS RDS (usualmente en certs/global-bundle.pem)
// let sslCert: string;
// try {
//   sslCert = fs.readFileSync(
//     path.join(process.cwd(), 'certs', 'global-bundle.pem'),
//     'utf8'
//   );
// } catch (err) {
//   console.error('❌ Could not read SSL certificate:', err);
//   throw new Error('Missing or unreadable SSL certificate');
// }

// const pool = new Pool({
//   user: process.env.PGUSER,
//   host: process.env.PGHOST,
//   database: process.env.PGDATABASE,
//   password: process.env.PGPASSWORD,
//   port: Number(process.env.PGPORT || 5432),
//   ssl: {
//     rejectUnauthorized: true,
//     ca: sslCert,
//   },
// });

// export async function GET() {
//   try {
//     const client = await pool.connect();
//     const result = await client.query('SELECT * FROM clinical_centers ORDER BY created_at DESC');
//     client.release();

//     return NextResponse.json({ centers: result.rows });
//   } catch (error) {
//     console.error('❌ Error fetching centers:', error);
//     return NextResponse.json(
//       {
//         error: 'Database connection failed',
//         details: error instanceof Error ? error.message : String(error),
//       },
//       { status: 500 }
//     );
//   }
// }

// app/api/sites/list/route.ts
// // app/api/sites/list/route.ts
// import { NextResponse } from 'next/server';
// import { getPool } from '@/lib/db';

// export const runtime = 'nodejs';

// export async function GET() {
//   try {
//     const pool = getPool();
//     const { rows } = await pool.query(`
//       SELECT id, name, address, city, country, zip_code, latitude, longitude
//       FROM clinical_centers
//       ORDER BY name ASC
//     `);
//     return NextResponse.json(rows, { status: 200 });
//   } catch (error: any) {
//     console.error('❌ /api/sites/list DB error:', error);
//     return NextResponse.json(
//       {
//         error: 'DB error',
//         details: error?.message ?? String(error),
//         code: error?.code,
//         host: process.env.PGHOST,
//         haveEnv: {
//           PGHOST: !!process.env.PGHOST,
//           PGPORT: !!process.env.PGPORT,
//           PGDATABASE: !!process.env.PGDATABASE,
//           PGUSER: !!process.env.PGUSER,
//           PGPASSWORD: !!process.env.PGPASSWORD,
//           PGSSLMODE: process.env.PGSSLMODE ?? null,
//           PGSSLROOTCERT: process.env.PGSSLROOTCERT ?? null,
//         },
//       },
//       { status: 500 },
//     );
//   }
// }