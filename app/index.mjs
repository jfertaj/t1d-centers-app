// index.mjs
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import pgPkg from 'pg';
import net from 'node:net';

const { Pool } = pgPkg;

// ===== Config =====
const ORIGINS_ALLOW = new Set([
  'http://localhost:3000',
  'https://t1d-centers-app.org',
  'https://www.t1d-centers-app.org',
  'https://innodia-t1d-navigator.org', 
  'https://www.innodia-t1d-navigator.org',
]);

const BASE           = '/t1d-centers-proxy';
const HEALTH         = `${BASE}/health`;
const DEBUG_TCP      = `${BASE}/debug/tcp`;
const DEBUG_PG       = `${BASE}/debug/pg`;
const CENTERS        = `${BASE}/centers`;
const ADMIN_RECREATE = `${BASE}/admin/recreate`;
const ADMIN_ADD_GEO  = `${BASE}/admin/add-geo-columns`;
const ADMIN_STATS    = `${BASE}/admin/stats`;   // 👈 NUEVO

const FIELDS = [
  'name',
  'address',
  'city',
  'country',
  'zip_code',
  'type_of_ed',
  'detect_site',
  'contact_name_1', 'email_1', 'phone_1',
  'contact_name_2', 'email_2', 'phone_2',
  'contact_name_3', 'email_3', 'phone_3',
  'contact_name_4', 'email_4', 'phone_4',
  'contact_name_5', 'email_5', 'phone_5',
  'contact_name_6', 'email_6', 'phone_6',
  'latitude',
  'longitude',
];

const sm = new SecretsManagerClient({});
let pool; // DB pool singleton

// ===== Helpers =====
function jsonResponse(statusCode, body, origin) {
  const allowOrigin = origin && ORIGINS_ALLOW.has(origin)
    ? origin
    : Array.from(ORIGINS_ALLOW)[0] || '*';

  return {
    statusCode,
    headers: {
      'content-type': 'application/json',
      'Access-Control-Allow-Origin': allowOrigin,
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Admin-Token',
    },
    body: JSON.stringify(body),
  };
}

function normalizePath(event) {
  let p = event.rawPath || event.requestContext?.http?.path || event.path || '/';
  const stage = event.requestContext?.stage;
  if (stage && p.startsWith(`/${stage}`)) p = p.slice(stage.length + 1);
  return p;
}

function parseJsonSafe(s) {
  try { return s ? JSON.parse(s) : {}; } catch { return {}; }
}

async function loadDbConfigFromSecret() {
  const arn = process.env.PG_SECRET_ARN;
  if (!arn) throw new Error('PG_SECRET_ARN not set');

  const res = await sm.send(new GetSecretValueCommand({ SecretId: arn }));
  const sec = JSON.parse(res.SecretString || '{}');

  const cfg = {
    host: sec.host || sec.hostname,
    port: Number(sec.port || 5432),
    user: sec.username || sec.user,
    password: sec.password,
    database: sec.dbname || 'clinical_centers', // fallback por si no viene en el secret
  };

  if (!cfg.host || !cfg.user || !cfg.password || !cfg.database) {
    throw new Error('Secret missing: host/user/password/dbname');
  }
  return cfg;
}

async function getPool() {
  if (pool) return pool;
  const cfg = await loadDbConfigFromSecret();
  pool = new Pool({
    host: cfg.host,
    port: cfg.port,
    user: cfg.user,
    password: cfg.password,
    database: cfg.database,
    ssl: { rejectUnauthorized: false }, // RDS Proxy/SSL
    max: 4,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 8_000,
    keepAlive: true,
  });
  // ping
  await pool.query('SELECT 1');
  return pool;
}

// TCP probe opcional
async function tcpProbe(host, port, timeoutMs = 1500) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let done = false;
    const end = (ok, err) => {
      if (done) return;
      done = true;
      try { socket.destroy(); } catch {}
      resolve({ ok, err: err ? String(err) : undefined });
    };
    socket
      .setTimeout(timeoutMs)
      .once('connect', () => end(true))
      .once('timeout', () => end(false, 'timeout'))
      .once('error', (e) => end(false, e))
      .connect(port, host);
  });
}

// --- Geocoding backend (Google)
async function geocodeAddress(fullAddress) {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) return null;

  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(fullAddress)}&key=${apiKey}`;
  try {
    const res = await fetch(url, { method: 'GET' });
    const data = await res.json();
    const top = data?.results?.[0];
    if (!top || top.partial_match) return null;
    const { lat, lng } = top.geometry?.location || {};
    if (typeof lat === 'number' && typeof lng === 'number') {
      return { lat, lng };
    }
    return null;
  } catch {
    return null;
  }
}

// ===== SQL builders =====
function buildInsert(valuesObj) {
  const cols = [];
  const placeholders = [];
  const values = [];
  FIELDS.forEach((f, i) => {
    cols.push(f);
    placeholders.push(`$${i + 1}`);
    values.push(valuesObj[f] ?? null);
  });
  const sql = `
    INSERT INTO clinical_centers (${cols.join(',')})
    VALUES (${placeholders.join(',')})
    RETURNING id
  `;
  return { sql, values };
}

function buildUpdate(valuesObj) {
  const sets = [];
  const values = [];
  let i = 1;
  for (const f of FIELDS) {
    if (Object.prototype.hasOwnProperty.call(valuesObj, f)) {
      sets.push(`${f} = $${i++}`);
      values.push(valuesObj[f]);
    }
  }
  const sql = `
    UPDATE clinical_centers
    SET ${sets.join(', ')}
    WHERE id = $${i}
    RETURNING *
  `;
  return { sql, values };
}

// ===== Handler =====
export const handler = async (event) => {
  const origin = event.headers?.origin || event.headers?.Origin;
  const method = (event.requestContext?.http?.method || event.httpMethod || 'GET').toUpperCase();
  const path = normalizePath(event);

  // CORS preflight
  if (method === 'OPTIONS') return jsonResponse(200, { ok: true }, origin);

  try {
    // --- Health ---
    if (method === 'GET' && path === HEALTH) {
      try {
        const cfg = await loadDbConfigFromSecret();
        const tcp = await tcpProbe(cfg.host, cfg.port, 1200);
        const db = await getPool();
        const { rows } = await db.query('SELECT 1 as ok');
        return jsonResponse(200, { ok: true, tcp, db: rows[0]?.ok === 1 }, origin);
      } catch (err) {
        console.error('health error', err);
        return jsonResponse(500, { ok: false, error: String(err) }, origin);
      }
    }

    // --- Debug TCP ---
    if (method === 'GET' && path === DEBUG_TCP) {
      try {
        const cfg = await loadDbConfigFromSecret();
        const tcp = await tcpProbe(cfg.host, cfg.port, 1500);
        return jsonResponse(200, { ok: tcp?.ok === true, tcp }, origin);
      } catch (err) {
        return jsonResponse(500, { ok: false, error: String(err) }, origin);
      }
    }

    // --- Debug PG (SELECT 1) ---
    if (method === 'GET' && path === DEBUG_PG) {
      try {
        const db = await getPool();
        const { rows } = await db.query('SELECT 1 as ok');
        return jsonResponse(200, { ok: rows[0]?.ok === 1 }, origin);
      } catch (err) {
        console.error('debug/pg error', err);
        return jsonResponse(500, { ok: false, error: String(err) }, origin);
      }
    }

    // === Admin: recreate (drop/create con columnas geo) ===
    if (method === 'POST' && path === ADMIN_RECREATE) {
      const token = event.headers?.['x-admin-token'] || event.headers?.['X-Admin-Token'];
      if (token !== (process.env.ADMIN_TOKEN || '')) {
        return jsonResponse(403, { error: 'Forbidden' }, origin);
      }
      const db = await getPool();
      const client = await db.connect();
      try {
        await client.query('DROP TABLE IF EXISTS clinical_centers');
        await client.query(`
          CREATE TABLE clinical_centers (
            id SERIAL PRIMARY KEY,
            name TEXT,
            address TEXT,
            city TEXT,
            country TEXT,
            zip_code TEXT,
            type_of_ed TEXT,
            detect_site TEXT,
            contact_name_1 TEXT, email_1 TEXT, phone_1 TEXT,
            contact_name_2 TEXT, email_2 TEXT, phone_2 TEXT,
            contact_name_3 TEXT, email_3 TEXT, phone_3 TEXT,
            contact_name_4 TEXT, email_4 TEXT, phone_4 TEXT,
            contact_name_5 TEXT, email_5 TEXT, phone_5 TEXT,
            contact_name_6 TEXT, email_6 TEXT, phone_6 TEXT,
            latitude DOUBLE PRECISION,
            longitude DOUBLE PRECISION,
            created_at TIMESTAMP DEFAULT NOW()
          )
        `);
      } finally {
        client.release();
      }
      return jsonResponse(200, { ok: true, message: 'clinical_centers recreated' }, origin);
    }

    // === Admin: añadir columnas geo si faltan (sin borrar datos) ===
    if (method === 'POST' && path === ADMIN_ADD_GEO) {
      const token = event.headers?.['x-admin-token'] || event.headers?.['X-Admin-Token'];
      if (token !== (process.env.ADMIN_TOKEN || '')) {
        return jsonResponse(403, { error: 'Forbidden' }, origin);
      }
      const db = await getPool();
      await db.query(`ALTER TABLE clinical_centers ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION`);
      await db.query(`ALTER TABLE clinical_centers ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION`);
      return jsonResponse(200, { ok: true }, origin);
    }

    // === Admin: stats (público o protégelo si quieres) ===
    if (method === 'GET' && path === ADMIN_STATS) {
      const db = await getPool();
      const [totalRes, countriesRes, geoRes] = await Promise.all([
        db.query('SELECT COUNT(*) AS c FROM clinical_centers'),
        db.query('SELECT COUNT(DISTINCT country) AS c FROM clinical_centers'),
        db.query('SELECT COUNT(*) AS c FROM clinical_centers WHERE latitude IS NOT NULL AND longitude IS NOT NULL'),
      ]);

      const totalCenters = Number(totalRes.rows[0]?.c ?? 0);
      const countriesCount = Number(countriesRes.rows[0]?.c ?? 0);
      const centersWithCoordinates = Number(geoRes.rows[0]?.c ?? 0);

      return jsonResponse(200, { totalCenters, countriesCount, centersWithCoordinates }, origin);
    }

    // === GET /centers ===
    if (method === 'GET' && path === CENTERS) {
      const db = await getPool();
      const { rows } = await db.query(`
        SELECT id, ${FIELDS.join(', ')}
        FROM clinical_centers
        ORDER BY id DESC
      `);
      return jsonResponse(200, rows, origin);
    }

    // === POST /centers ===
    if (method === 'POST' && path === CENTERS) {
      const input = parseJsonSafe(event.body) || {};

      // geocoding opcional
      const full = [input.address, input.city, input.zip_code, input.country]
        .filter(Boolean)
        .join(', ');
      if (full) {
        const latLng = await geocodeAddress(full);
        if (latLng) {
          input.latitude = latLng.lat;
          input.longitude = latLng.lng;
        }
      }

      const db = await getPool();
      const { sql, values } = buildInsert(input);
      const { rows } = await db.query(sql, values);
      return jsonResponse(201, { success: true, id: rows[0]?.id }, origin);
    }

    // === /centers/{id} ===
    const m = path.match(new RegExp(`^${CENTERS}/(\\d+)$`));
    if (m) {
      const id = Number(m[1]);

      if (method === 'PUT') {
        const input = parseJsonSafe(event.body) || {};

        // re-geocode si cambia la dirección
        const willRegeo = ['address', 'city', 'zip_code', 'country'].some(k => k in input);
        if (willRegeo) {
          const full = [input.address, input.city, input.zip_code, input.country]
            .filter(Boolean)
            .join(', ');
          if (full) {
            const latLng = await geocodeAddress(full);
            if (latLng) {
              input.latitude = latLng.lat;
              input.longitude = latLng.lng;
            } else {
              input.latitude = null;
              input.longitude = null;
            }
          }
        }

        const { sql, values } = buildUpdate(input);
        if (!sql.includes('SET')) {
          return jsonResponse(400, { error: 'No valid fields to update' }, origin);
        }
        const db = await getPool();
        const { rows } = await db.query(sql, [...values, id]);
        if (!rows.length) return jsonResponse(404, { error: 'Not found' }, origin);
        return jsonResponse(200, { success: true, center: rows[0] }, origin);
      }

      if (method === 'DELETE') {
        const db = await getPool();
        const res = await db.query('DELETE FROM clinical_centers WHERE id = $1', [id]);
        if (res.rowCount === 0) return jsonResponse(404, { error: 'Not found' }, origin);
        return jsonResponse(200, { success: true }, origin);
      }
    }

    // 404 por defecto
    return jsonResponse(404, { error: 'Not found', path, method }, origin);
  } catch (err) {
    console.error('Handler error:', err);
    return jsonResponse(500, { error: 'DB error', details: String(err?.message || err) }, origin);
  }
};