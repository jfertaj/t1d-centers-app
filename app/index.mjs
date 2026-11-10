// index.mjs
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import pgPkg from 'pg';
import net from 'node:net';

const { Pool } = pgPkg;

/* =========================
   Config & Constants
========================= */
const ORIGINS_ALLOW = new Set([
  'http://localhost:3000',
  'https://t1d-centers-app.org',
  'https://www.t1d-centers-app.org',
  'https://innodia-t1d-navigator.org',
  'https://www.innodia-t1d-navigator.org',
]);

const BASE                = '/t1d-centers-proxy';
const HEALTH              = `${BASE}/health`;
const DEBUG_TCP           = `${BASE}/debug/tcp`;
const DEBUG_PG            = `${BASE}/debug/pg`;
const CENTERS             = `${BASE}/centers`;
const ADMIN_RECREATE      = `${BASE}/admin/recreate`;
const ADMIN_ADD_GEO       = `${BASE}/admin/add-geo-columns`; // compat
const ADMIN_ADD_SCHEMA    = `${BASE}/admin/add-schema`;      // asegurar std cols
const ADMIN_ADD_COLUMNS   = `${BASE}/admin/add-columns`;     // genérico
const ADMIN_COLUMNS_META  = `${BASE}/admin/columns`;         // describe tabla
const ADMIN_STATS         = `${BASE}/admin/stats`;
const GEOCODING_VERIFY    = `${BASE}/geocoding/verify`;
// 👉 NUEVO: proxy Distance Matrix
const DISTANCE            = `${BASE}/distance`;

// Program rules
const PROGRAM_RULES       = `${BASE}/program-rules`;
const ADMIN_CREATE_RULES  = `${BASE}/admin/create-rules-table`;

// 👉 NUEVO: re-geocodificar los centros sin lat/lng
const ADMIN_REGEO_MISSING = `${BASE}/admin/regeo-missing`;

/* =========================
   Dynamic schema helpers
========================= */
const sm = new SecretsManagerClient({});
let pool;                              // DB pool singleton
const tableColumnsCache = new Map();   // cache nombres
const tableMetaCache    = new Map();   // cache metadatos

function jsonResponse(statusCode, body, origin) {
  const allowOrigin = origin && ORIGINS_ALLOW.has(origin)
    ? origin
    : Array.from(ORIGINS_ALLOW)[0] || '*';

  return {
    statusCode,
    headers: {
      'content-type': 'application/json',
      'Access-Control-Allow-Origin': allowOrigin,
      'Vary': 'Origin',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Admin-Token',
      'Access-Control-Max-Age': '3600',
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

// DDL can't take bind parameters, so a column DEFAULT must be rendered as SQL.
// The admin UI (AddColumnModal) sends it already formatted: a number, TRUE /
// FALSE, a temporal keyword, or a quoted '...' literal. Each form is validated
// and string literals are re-escaped with pg.escapeLiteral, instead of being
// interpolated raw (which let a crafted default run arbitrary SQL).
// Returns '' for no default, the DEFAULT clause, or null when not allowed.
const COLUMN_TYPES = new Set(['TEXT','INTEGER','DOUBLE PRECISION','BOOLEAN','DATE','TIMESTAMP']);
const TEMPORAL_DEFAULTS = { CURRENT_DATE: 'CURRENT_DATE', CURRENT_TIMESTAMP: 'CURRENT_TIMESTAMP', 'NOW()': 'NOW()' };
function columnDefault(type, raw) {
  if (!COLUMN_TYPES.has(type)) return null;
  if (raw === undefined || raw === null || raw === '') return '';
  const v = String(raw).trim();
  switch (type) {
    case 'INTEGER':          return /^-?\d+$/.test(v) ? `DEFAULT ${v}` : null;
    case 'DOUBLE PRECISION': return /^-?\d+(\.\d+)?([eE][-+]?\d+)?$/.test(v) ? `DEFAULT ${v}` : null;
    case 'BOOLEAN':          return /^(true|false)$/i.test(v) ? `DEFAULT ${v.toUpperCase()}` : null;
  }
  // TEXT, DATE, TIMESTAMP
  const temporal = TEMPORAL_DEFAULTS[v.toUpperCase()];
  if (temporal) return type === 'TEXT' ? null : `DEFAULT ${temporal}`;
  const quoted = v.match(/^'((?:[^']|'')*)'$/);
  const text = quoted ? quoted[1].replace(/''/g, "'") : v;
  return `DEFAULT ${pgPkg.escapeLiteral(text)}`;
}

function parseJsonSafe(s) {
  try { return s ? JSON.parse(s) : {}; } catch { return {}; }
}

/* =========================
   DB config (Secrets o ENV)
========================= */

function required(v, name) {
  if (!v) throw new Error(`Missing required DB variable: ${name}`);
  return v;
}

async function loadDbConfig() {
  const arn = process.env.PG_SECRET_ARN;

  // 1) Secrets Manager si existe
  if (arn) {
    const res = await sm.send(new GetSecretValueCommand({ SecretId: arn }));
    const sec = JSON.parse(res.SecretString || '{}');

    const cfg = {
      host:     sec.host || sec.hostname,
      port:     Number(sec.port || 5432),
      user:     sec.username || sec.user,
      password: sec.password,
      database: sec.dbname || 'clinical_centers',
    };

    required(cfg.host, 'secret.host');
    required(cfg.user, 'secret.username');
    required(cfg.password, 'secret.password');
    required(cfg.database, 'secret.dbname');

    return cfg;
  }

  // 2) Fallback a variables clásicas (como en tus capturas)
  return {
    host:     required(process.env.PGHOST, 'PGHOST'),
    port:     Number(process.env.PGPORT || 5432),
    user:     required(process.env.PGUSER, 'PGUSER'),
    password: required(process.env.PGPASSWORD, 'PGPASSWORD'),
    database: required(process.env.PGDATABASE, 'PGDATABASE'),
  };
}

async function getPool() {
  if (pool) return pool;
  const cfg = await loadDbConfig();
  pool = new Pool({
    host: cfg.host,
    port: cfg.port,
    user: cfg.user,
    password: cfg.password,
    database: cfg.database,
    ssl: { rejectUnauthorized: false },
    max: 4,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 25_000,
    keepAlive: true,
  });
  await pool.query('SELECT 1'); // test conexión
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

// Geocoding simple
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

// Geocoding detallado
async function geocodeDetailed(fullAddress) {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) return { ok: false, error: 'Missing GOOGLE_MAPS_API_KEY' };

  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(fullAddress)}&key=${apiKey}`;
  try {
    const res = await fetch(url, { method: 'GET' });
    if (!res.ok) return { ok: false, error: `Google fetch failed (${res.status})` };

    const data = await res.json();
    const status = data?.status || 'UNKNOWN';
    const top = data?.results?.[0];

    if (!top) {
      return { ok: false, partial: false, formatted_address: null, location: null, status };
    }

    const partial = !!top.partial_match;
    const loc = top.geometry?.location ?? null;
    return {
      ok: !partial && !!loc,
      partial,
      formatted_address: top.formatted_address ?? null,
      location: loc,
      status,
    };
  } catch (e) {
    return { ok: false, error: String(e?.message || e) };
  }
}

/* =========================
   Dynamic builders
========================= */

// Metadatos completos
async function getTableColumnsMeta(table) {
  const k = `meta:${table}`;
  if (tableMetaCache.has(k)) return tableMetaCache.get(k);
  const db = await getPool();
  const { rows } = await db.query(
    `
    SELECT
      column_name,
      data_type,
      is_nullable,
      column_default
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = $1
    ORDER BY ordinal_position
    `,
    [table]
  );
  tableMetaCache.set(k, rows);
  return rows;
}

// Solo nombres (sin id/created_at)
async function getTableColumnNames(table) {
  const k = `names:${table}`;
  if (tableColumnsCache.has(k)) return tableColumnsCache.get(k);
  const db = await getPool();
  const { rows } = await db.query(
    `
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = $1
      AND column_name NOT IN ('id','created_at')
    ORDER BY ordinal_position
    `,
    [table]
  );
  const cols = rows.map(r => r.column_name);
  tableColumnsCache.set(k, cols);
  return cols;
}

function buildInsertDynamic(table, tableColumns, valuesObj) {
  const cols = [];
  const placeholders = [];
  const values = [];
  let i = 1;

  for (const col of tableColumns) {
    if (Object.prototype.hasOwnProperty.call(valuesObj, col)) {
      cols.push(col);
      placeholders.push(`$${i++}`);
      values.push(valuesObj[col]);
    }
  }
  const sql = `
    INSERT INTO ${table} (${cols.join(',')})
    VALUES (${placeholders.join(',')})
    RETURNING id
  `;
  return { sql, values };
}

function buildUpdateDynamic(table, tableColumns, valuesObj) {
  const sets = [];
  const values = [];
  let i = 1;

  for (const col of tableColumns) {
    if (Object.prototype.hasOwnProperty.call(valuesObj, col)) {
      sets.push(`${col} = $${i++}`);
      values.push(valuesObj[col]);
    }
  }
  const sql = `
    UPDATE ${table}
    SET ${sets.join(', ')}
    WHERE id = $${i}
    RETURNING *
  `;
  return { sql, values };
}

/* =========================
   Helpers para reglas (LEGACY ↔ NUEVO)
========================= */

async function tableHasColumn(table, column) {
  const db = await getPool();
  const { rowCount } = await db.query(
    `SELECT 1
       FROM information_schema.columns
      WHERE table_schema='public'
        AND table_name=$1
        AND column_name=$2
      LIMIT 1`,
    [table, column],
  );
  return rowCount > 0;
}

async function getExistingColumns(table) {
  const db = await getPool();
  const { rows } = await db.query(
    `SELECT column_name
       FROM information_schema.columns
      WHERE table_schema='public' AND table_name=$1`,
    [table],
  );
  return new Set(rows.map(r => r.column_name));
}

// Mapea fila BD → formato esperado por el front
function mapRuleRowOut(r, hasActive) {
  return {
    ...r,
    zip_pattern : r.zip_pattern  ?? r.rule_pattern ?? null,
    program_code: r.program_code ?? r.program_key  ?? null,
    website     : r.website      ?? r.program_url  ?? null,
    message     : r.message      ?? r.notes        ?? '',
    priority    : r.priority     ?? 100,
    active      : hasActive ? (r.active ?? true) : true,
  };
}

// Mapea payload del front → columnas reales existentes.
// Los dos editores usan nombres distintos para el mismo dato (ProgramRulesEditor:
// rule_pattern / program_key / program_url; la página legacy: zip_pattern /
// program_code / website / message). Se distingue "campo ausente" (no tocar)
// de "campo enviado como null" (borrar), y postal_format (el formato, p. ej.
// "NNNNN") ya no se sobrescribe con el patrón de matching.
function mapRuleInToDb(body, existing) {
  const out = {};
  const sent = (k) => Object.prototype.hasOwnProperty.call(body, k);
  // Primer alias presente en el body; undefined si no se envió ninguno. El
  // orden (alias legacy primero) es el del código original, para que un
  // cliente que reenvía la fila completa del GET siga comportándose igual.
  const pick = (...keys) => {
    const k = keys.find(sent);
    return k === undefined ? undefined : body[k];
  };
  // Escribe el valor en todas las columnas-alias que existan en la tabla.
  const put = (value, ...cols) => {
    if (value === undefined) return;
    for (const c of cols) if (existing.has(c)) out[c] = value;
  };

  for (const k of ['country', 'age_from', 'age_to', 'type_of_ed', 'program_name', 'priority', 'active', 'sites']) {
    if (sent(k) && (existing.has(k) || ['country', 'age_from', 'age_to', 'type_of_ed', 'program_name'].includes(k))) {
      out[k] = body[k];
    }
  }

  put(pick('zip_pattern', 'rule_pattern'), 'rule_pattern', 'zip_pattern');
  put(pick('postal_format'), 'postal_format');
  put(pick('program_code', 'program_key'), 'program_key', 'program_code');
  put(pick('website', 'program_url'), 'program_url', 'website');
  put(pick('message', 'notes'), 'message', 'notes');

  return out;
}

/* =========================
   Handler
========================= */
export const handler = async (event) => {
  const origin = event.headers?.origin || event.headers?.Origin;
  const method = (event.requestContext?.http?.method || event.httpMethod || 'GET').toUpperCase();
  const path = normalizePath(event);

  // CORS preflight
  if (method === 'OPTIONS') return jsonResponse(200, { ok: true }, origin);

  try {
    /* ---------- Health & Debug ---------- */
    if (method === 'GET' && path === HEALTH) {
      try {
        const cfg = await loadDbConfig();
        const tcp = await tcpProbe(cfg.host, cfg.port, 1200);
        const db = await getPool();
        const { rows } = await db.query('SELECT 1 as ok');
        return jsonResponse(200, { ok: true, tcp, db: rows[0]?.ok === 1 }, origin);
      } catch (err) {
        console.error('health error', err);
        return jsonResponse(500, { ok: false, error: String(err) }, origin);
      }
    }

    if (method === 'GET' && path === DEBUG_TCP) {
      try {
        const cfg = await loadDbConfig();
        const tcp = await tcpProbe(cfg.host, cfg.port, 1500);
        return jsonResponse(200, { ok: tcp?.ok === true, tcp }, origin);
      } catch (err) {
        return jsonResponse(500, { ok: false, error: String(err) }, origin);
      }
    }

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

    /* ---------- Admin: schema describe (SIN token) ---------- */
    if (method === 'GET' && path === ADMIN_COLUMNS_META) {
      const qs = event.queryStringParameters || {};
      const table = (qs.table || '').toString().trim();
      if (!table) return jsonResponse(400, { error: 'table required' }, origin);
      if (!/^[a-zA-Z0-9_]+$/.test(table)) {
        return jsonResponse(400, { error: 'Invalid table name' }, origin);
      }
      const meta = await getTableColumnsMeta(table);
      return jsonResponse(200, { table, columns: meta }, origin);
    }

    /* ---------- Admin: schema ops (CON token) ---------- */
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

            age_from INTEGER,
            age_to   INTEGER,
            monitor  BOOLEAN,

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
      tableColumnsCache.delete('names:clinical_centers');
      tableMetaCache.delete('meta:clinical_centers');
      return jsonResponse(200, { ok: true, message: 'clinical_centers recreated' }, origin);
    }

    // Compat: añade columnas geo
    if (method === 'POST' && path === ADMIN_ADD_GEO) {
      const token = event.headers?.['x-admin-token'] || event.headers?.['X-Admin-Token'];
      if (token !== (process.env.ADMIN_TOKEN || '')) {
        return jsonResponse(403, { error: 'Forbidden' }, origin);
      }
      const db = await getPool();
      await db.query(`ALTER TABLE clinical_centers ADD COLUMN IF NOT EXISTS latitude  DOUBLE PRECISION`);
      await db.query(`ALTER TABLE clinical_centers ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION`);
      return jsonResponse(200, { ok: true }, origin);
    }

    // Asegurar age_from/age_to/monitor (+ geo por si acaso)
    if (method === 'POST' && path === ADMIN_ADD_SCHEMA) {
      const token = event.headers?.['x-admin-token'] || event.headers?.['X-Admin-Token'];
      if (token !== (process.env.ADMIN_TOKEN || '')) {
        return jsonResponse(403, { error: 'Forbidden' }, origin);
      }
      const db = await getPool();
      await db.query(`ALTER TABLE clinical_centers ADD COLUMN IF NOT EXISTS age_from INTEGER`);
      await db.query(`ALTER TABLE clinical_centers ADD COLUMN IF NOT EXISTS age_to   INTEGER`);
      await db.query(`ALTER TABLE clinical_centers ADD COLUMN IF NOT EXISTS monitor  BOOLEAN`);
      await db.query(`ALTER TABLE clinical_centers ADD COLUMN IF NOT EXISTS latitude  DOUBLE PRECISION`);
      await db.query(`ALTER TABLE clinical_centers ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION`);
      tableColumnsCache.delete('names:clinical_centers');
      tableMetaCache.delete('meta:clinical_centers');
      return jsonResponse(200, { ok: true, message: 'schema ensured' }, origin);
    }

    // Añadir columnas arbitrarias
    if (method === 'POST' && path === ADMIN_ADD_COLUMNS) {
      const token = event.headers?.['x-admin-token'] || event.headers?.['X-Admin-Token'];
      if (token !== (process.env.ADMIN_TOKEN || '')) {
        return jsonResponse(403, { error: 'Forbidden' }, origin);
      }
      const body = parseJsonSafe(event.body);
      const table = String(body.table || '').trim();
      const columns = Array.isArray(body.columns) ? body.columns : [];
      if (!table || !columns.length) {
        return jsonResponse(400, { error: 'table and columns[] required' }, origin);
      }
      if (!/^[a-zA-Z0-9_]+$/.test(table)) {
        return jsonResponse(400, { error: 'Invalid table name' }, origin);
      }

      // Validate every column before touching the schema, then apply them in
      // one transaction, so a bad entry can't leave a half-applied batch.
      const statements = [];
      for (const c of columns) {
        const name = String(c.name || '').trim();
        const type = String(c.type || '').trim().toUpperCase();
        if (!name || !type) continue;
        if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(name)) {
          return jsonResponse(400, { error: `Invalid column name: ${name}` }, origin);
        }
        const def = columnDefault(type, c.default);
        if (def === null) {
          return jsonResponse(400, { error: `Invalid type or default for column ${name}` }, origin);
        }
        const nullable = c.nullable === false ? 'NOT NULL' : '';
        statements.push(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS ${name} ${type} ${def} ${nullable}`.replace(/\s+/g,' ').trim());
      }

      const db = await getPool();
      const client = await db.connect();
      try {
        await client.query('BEGIN');
        for (const sql of statements) await client.query(sql);
        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK').catch(() => {});
        throw err;
      } finally {
        client.release();
      }
      tableColumnsCache.delete(`names:${table}`);
      tableMetaCache.delete(`meta:${table}`);
      return jsonResponse(200, { ok: true }, origin);
    }

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

    // Admin: crear tabla de reglas si no existe (nuevo esquema opcional)
    if (method === 'POST' && path === ADMIN_CREATE_RULES) {
      const token = event.headers?.['x-admin-token'] || event.headers?.['X-Admin-Token'];
      if (token !== (process.env.ADMIN_TOKEN || '')) {
        return jsonResponse(403, { error: 'Forbidden' }, origin);
      }
      const db = await getPool();
      await db.query(`
        CREATE TABLE IF NOT EXISTS region_program_rules (
          id SERIAL PRIMARY KEY,
          country TEXT NOT NULL,
          zip_pattern TEXT,
          zip_from INTEGER,
          zip_to INTEGER,
          age_from INTEGER,
          age_to INTEGER,
          program_code TEXT,
          program_name TEXT NOT NULL,
          message TEXT,
          website TEXT,
          priority INTEGER DEFAULT 100,
          active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT NOW()
        );
      `);
      await db.query(`CREATE INDEX IF NOT EXISTS idx_rules_country ON region_program_rules(country)`);
      await db.query(`CREATE INDEX IF NOT EXISTS idx_rules_ziprange ON region_program_rules(zip_from, zip_to)`);
      await db.query(`CREATE INDEX IF NOT EXISTS idx_rules_active ON region_program_rules(active)`);
      return jsonResponse(200, { ok: true, message: 'region_program_rules ready' }, origin);
    }

    /* ---------- Geocoding Verify ---------- */
    if (method === 'POST' && path === GEOCODING_VERIFY) {
      const body = parseJsonSafe(event.body);
      const full = [body.address, body.city, body.zip_code, body.country]
        .filter(Boolean)
        .join(', ');
      if (!full) return jsonResponse(400, { ok: false, error: 'Missing address parts' }, origin);

      const result = await geocodeDetailed(full);
      return jsonResponse(200, result, origin);
    }

    /* ---------- NUEVO: Proxy Distance Matrix (con logs) ---------- */
    if (method === 'POST' && path === DISTANCE) {
      const apiKey = process.env.GOOGLE_MAPS_API_KEY;
      if (!apiKey) return jsonResponse(500, { ok: false, error: 'Missing GOOGLE_MAPS_API_KEY', source: 'server_misconfig' }, origin);

      const body = parseJsonSafe(event.body) || {};
      const originLL = body.origin;
      const dests = Array.isArray(body.destinations) ? body.destinations : [];

      if (!originLL || typeof originLL.lat !== 'number' || typeof originLL.lng !== 'number') {
        return jsonResponse(400, { ok: false, error: 'origin {lat,lng} required', source: 'bad_request' }, origin);
      }
      if (!dests.length) {
        return jsonResponse(400, { ok: false, error: 'destinations[] required', source: 'bad_request' }, origin);
      }

      // Google admite hasta 25 destinos por request (standard tier)
      const limited = dests.slice(0, 25);
      const o = `${originLL.lat},${originLL.lng}`;
      const d = limited.map((p) => `${p.lat},${p.lng}`).join('|');

      const url =
        `https://maps.googleapis.com/maps/api/distancematrix/json` +
        `?origins=${encodeURIComponent(o)}` +
        `&destinations=${encodeURIComponent(d)}` +
        `&units=metric&mode=driving&key=${apiKey}`;

      try {
        console.log('[distance] calling Google DM… origins=%s destinations=%d', o, limited.length);
        const res = await fetch(url, { method: 'GET' });
        const data = await res.json();

        const dmStatus = data?.status || 'UNKNOWN';
        const elems = data?.rows?.[0]?.elements ?? [];
        const distances = elems.map((e) => (e?.status === 'OK' ? e.distance?.value ?? null : null));

        console.log('[distance] Google DM status=%s items=%d', dmStatus, distances.length);
        return jsonResponse(200, { ok: true, distances, status: dmStatus, source: 'google' }, origin);
      } catch (e) {
        console.error('[distance] Google DM error:', e);
        return jsonResponse(500, { ok: false, error: String(e?.message || e), source: 'google_error' }, origin);
      }
    }

    /* ---------- NUEVO: Re-geocode de centros sin lat/lng ---------- */
    if (method === 'POST' && path === ADMIN_REGEO_MISSING) {
      const token = event.headers?.['x-admin-token'] || event.headers?.['X-Admin-Token'];
      if (token !== (process.env.ADMIN_TOKEN || '')) {
        return jsonResponse(403, { error: 'Forbidden' }, origin);
      }

      const db = await getPool();
      const body = parseJsonSafe(event.body) || {};
      const limit = Math.max(1, Math.min(500, Number(body.limit || 200)));

      const { rows } = await db.query(
        `
          SELECT id, address, city, zip_code, country
          FROM clinical_centers
          WHERE (latitude IS NULL OR longitude IS NULL)
          ORDER BY id ASC
          LIMIT $1
        `,
        [limit]
      );

      let attempted = 0;
      let updated = 0;
      const errors = [];

      for (const r of rows) {
        attempted++;
        const full = [r.address, r.city, r.zip_code, r.country].filter(Boolean).join(', ');
        if (!full) {
          errors.push({ id: r.id, error: 'missing address components' });
          continue;
        }
        try {
          const g = await geocodeDetailed(full);
          if (g && g.ok && g.location && typeof g.location.lat === 'number' && typeof g.location.lng === 'number') {
            await db.query(
              `UPDATE clinical_centers SET latitude=$1, longitude=$2 WHERE id=$3`,
              [g.location.lat, g.location.lng, r.id]
            );
            updated++;
          } else {
            // dejamos null para permitir edición manual posterior
            await db.query(
              `UPDATE clinical_centers SET latitude=NULL, longitude=NULL WHERE id=$1`,
              [r.id]
            );
            errors.push({
              id: r.id,
              error: g?.status || g?.error || 'geocode failed',
              partial: g?.partial ?? undefined,
            });
          }
        } catch (e) {
          errors.push({ id: r.id, error: String(e?.message || e) });
        }
      }

      return jsonResponse(200, { attempted, updated, errors }, origin);
    }

    /* ---------- Centers CRUD (dinámico) ---------- */
    if (method === 'GET' && path === CENTERS) {
      const db = await getPool();
      const { rows } = await db.query(`SELECT * FROM clinical_centers ORDER BY id DESC`);
      return jsonResponse(200, rows, origin);
    }

    if (method === 'POST' && path === CENTERS) {
      const input = parseJsonSafe(event.body) || {};

      // normalizaciones a número o null
      if (input.age_from != null) input.age_from = Number(input.age_from);
      if (Number.isNaN(input.age_from)) input.age_from = null;

      if (input.age_to != null) input.age_to = Number(input.age_to);
      if (Number.isNaN(input.age_to)) input.age_to = null;

      if (input.monitor != null) {
        if (typeof input.monitor === 'string') {
          input.monitor = input.monitor === 'true' || input.monitor === '1';
        } else {
          input.monitor = Boolean(input.monitor);
        }
      }

      // ✅ Validaciones de edad
      if (input.age_from != null && input.age_from < 0) {
        return jsonResponse(400, { error: 'age_from must be >= 0' }, origin);
      }
      if (input.age_to != null && input.age_to < 0) {
        return jsonResponse(400, { error: 'age_to must be >= 0' }, origin);
      }
      if (input.age_from != null && input.age_to != null && !(input.age_to > input.age_from)) {
        return jsonResponse(400, { error: 'age_to must be greater than age_from' }, origin);
      }

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

      const cols = await getTableColumnNames('clinical_centers');
      const { sql, values } = buildInsertDynamic('clinical_centers', cols, input);
      if (!sql.includes('(') || values.length === 0) {
        return jsonResponse(400, { error: 'No valid fields to insert' }, origin);
      }
      const db = await getPool();
      const { rows } = await db.query(sql, values);
      return jsonResponse(201, { success: true, id: rows[0]?.id }, origin);
    }

    {
      const m = path.match(new RegExp(`^${CENTERS}/(\\d+)$`));
      if (m) {
        const id = Number(m[1]);

        if (method === 'PUT') {
          const input = parseJsonSafe(event.body) || {};

          if (input.age_from != null) input.age_from = Number(input.age_from);
          if ('age_from' in input && Number.isNaN(input.age_from)) input.age_from = null;

          if (input.age_to != null) input.age_to = Number(input.age_to);
          if ('age_to' in input && Number.isNaN(input.age_to)) input.age_to = null;

          if (input.monitor != null) {
            if (typeof input.monitor === 'string') {
              input.monitor = input.monitor === 'true' || input.monitor === '1';
            } else {
              input.monitor = Boolean(input.monitor);
            }
          }

          // ✅ Validaciones de edad (si vienen)
          if ('age_from' in input && input.age_from != null && input.age_from < 0) {
            return jsonResponse(400, { error: 'age_from must be >= 0' }, origin);
          }
          if ('age_to' in input && input.age_to != null && input.age_to < 0) {
            return jsonResponse(400, { error: 'age_to must be >= 0' }, origin);
          }
          if (('age_from' in input || 'age_to' in input)) {
            if (input.age_from != null && input.age_to != null && !(input.age_to > input.age_from)) {
              return jsonResponse(400, { error: 'age_to must be greater than age_from' }, origin);
            }
          }

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

          const cols = await getTableColumnNames('clinical_centers');
          const { sql, values } = buildUpdateDynamic('clinical_centers', cols, input);
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
    }

    /* ---------- Program Rules CRUD (compat legacy/new) ---------- */
    if (method === 'GET' && path === PROGRAM_RULES) {
      const qs = event.queryStringParameters || {};
      const where = [];
      const vals = [];
      if (qs.country) { where.push(`country = $${vals.length + 1}`); vals.push(qs.country); }

      const hasActive   = await tableHasColumn('region_program_rules', 'active');
      const hasPriority = await tableHasColumn('region_program_rules', 'priority');

      if (hasActive) {
        if (qs.active === 'true')  where.push(`active = true`);
        if (qs.active === 'false') where.push(`active = false`);
      }

      const orderBy = hasPriority ? 'priority ASC, id DESC' : 'id DESC';

      const db = await getPool();
      const sql = `
        SELECT *
          FROM region_program_rules
         ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
         ORDER BY ${orderBy}
      `;
      const { rows } = await db.query(sql, vals);
      const mapped = rows.map(r => mapRuleRowOut(r, hasActive));
      return jsonResponse(200, mapped, origin);
    }

    if (method === 'POST' && path === PROGRAM_RULES) {
      const body = parseJsonSafe(event.body) || {};

      // Validación mínima con nombres “nuevos”
      if (!body.country || !body.program_name || !(body.program_code || body.program_key)) {
        return jsonResponse(400, { error: 'country, program_name and program_code are required' }, origin);
      }

      const existing = await getExistingColumns('region_program_rules');
      const dbObj = mapRuleInToDb(body, existing);

      const cols = Object.keys(dbObj);
      if (!cols.length) return jsonResponse(400, { error: 'No valid fields for this table' }, origin);

      const placeholders = cols.map((_, i) => `$${i + 1}`);
      const values = cols.map((k) => dbObj[k]);

      const db = await getPool();
      const { rows } = await db.query(
        `INSERT INTO region_program_rules (${cols.join(',')}) VALUES (${placeholders.join(',')}) RETURNING id`,
        values
      );

      return jsonResponse(201, { success: true, id: rows[0]?.id }, origin);
    }

    {
      const m = path.match(new RegExp(`^${PROGRAM_RULES}/(\\d+)$`));
      if (m) {
        const id = Number(m[1]);

        if (method === 'GET') {
          const db = await getPool();
          const hasActive = await tableHasColumn('region_program_rules', 'active');
          const { rows } = await db.query(`SELECT * FROM region_program_rules WHERE id = $1`, [id]);
          if (!rows.length) return jsonResponse(404, { error: 'Not found' }, origin);
          return jsonResponse(200, mapRuleRowOut(rows[0], hasActive), origin);
        }

        if (method === 'PUT') {
          const body = parseJsonSafe(event.body) || {};
          const existing = await getExistingColumns('region_program_rules');
          const dbObj = mapRuleInToDb(body, existing);

          const sets = [];
          const values = [];
          let i = 1;
          for (const k of Object.keys(dbObj)) {
            sets.push(`${k} = $${i++}`);
            values.push(dbObj[k]);
          }
          if (!sets.length) return jsonResponse(400, { error: 'No valid fields to update' }, origin);

          const db = await getPool();
          const { rows } = await db.query(
            `UPDATE region_program_rules SET ${sets.join(', ')} WHERE id = $${i} RETURNING *`,
            [...values, id]
          );
          if (!rows.length) return jsonResponse(404, { error: 'Not found' }, origin);

          const hasActive = existing.has('active');
          return jsonResponse(200, { success: true, rule: mapRuleRowOut(rows[0], hasActive) }, origin);
        }

        if (method === 'DELETE') {
          const db = await getPool();
          const res = await db.query('DELETE FROM region_program_rules WHERE id = $1', [id]);
          if (res.rowCount === 0) return jsonResponse(404, { error: 'Not found' }, origin);
          return jsonResponse(200, { success: true }, origin);
        }
      }
    }

    // 404 default
    return jsonResponse(404, { error: 'Not found', path, method }, origin);
  } catch (err) {
    console.error('Handler error:', err);
    return jsonResponse(500, { error: 'DB error', details: String(err?.message || err) }, origin);
  }
};