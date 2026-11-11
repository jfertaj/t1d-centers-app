import { test } from 'node:test';
import assert from 'node:assert/strict';
import pg from 'pg';
import {
  parseNavigatorEvent, CREATE_EVENTS_TABLE, INSERT_EVENT, insertParams,
  MONTHLY_STATS, COUNTRY_STATS, CAMPAIGN_STATS,
} from './navigatorEvents.mjs';

const V = '0123456789abcdef';

test('valid events keep only allowed fields', () => {
  const { row } = parseNavigatorEvent({
    v: V, e: 'results_shown', flow: 'search', country: ' Belgium ', n: 3,
    source: 'innodia.org', utm: 'Newsletter', internal: true, zip: '1000', email: 'x@y.z',
  });
  assert.deepEqual(row, {
    visit_id: V, event: 'results_shown', country: 'Belgium', flow: 'search', branch: null,
    source: 'innodia.org', utm_source: 'newsletter', n_results: 3, internal: true,
  });
});

test('malformed requests are rejected', () => {
  assert.ok(parseNavigatorEvent(null).error);
  assert.ok(parseNavigatorEvent({ v: 'not-hex', e: 'visit' }).error);
  assert.ok(parseNavigatorEvent({ v: V, e: 'drop_table' }).error);
  assert.ok(parseNavigatorEvent({ v: { toString: null }, e: 'visit' }).error);
  assert.ok(parseNavigatorEvent({ v: [V], e: 'visit' }).error);
});

test('no free text is stored: unknown countries dropped, unknown campaigns become other', () => {
  const row = (extra) => parseNavigatorEvent({ v: V, e: 'visit', ...extra }).row;
  assert.equal(row({ country: 'Jane Doe' }).country, null);
  assert.equal(row({ country: 'Atlantis' }).country, null);
  assert.equal(row({ country: 'North Macedonia' }).country, 'North Macedonia');
  assert.equal(row({ utm: 'alice.smith-1985-04-12' }).utm_source, 'other');
  assert.equal(row({ utm: 'campaign_000001' }).utm_source, 'other');
  assert.equal(row({ utm: 'LinkedIn' }).utm_source, 'linkedin');
  assert.equal(row({}).utm_source, null);
});

test('bad optional values are dropped, not stored', () => {
  const { row } = parseNavigatorEvent({
    v: V, e: 'visit', country: "x'); DROP TABLE y; --", flow: 'admin', branch: 'yes',
    source: 'evil.com', n: -1, internal: 'true',
  });
  for (const k of ['country', 'flow', 'branch', 'source', 'utm_source', 'n_results']) assert.equal(row[k], null, k);
  assert.equal(row.internal, false);
  assert.equal(parseNavigatorEvent({ v: V, e: 'results_shown', n: 2.5 }).row.n_results, null);
});

// The report SQL runs against a real Postgres (CI starts one; locally set DATABASE_URL).
const url = process.env.DATABASE_URL;
if (process.env.CI && !url) throw new Error('DATABASE_URL must be set in CI so the SQL tests run');

const [A, B, C, D, E, S] = ['a', 'b', 'c', 'd', 'e', 'f'].map((ch) => ch.repeat(16));
const mid = (month) => `${month}-15T12:00:00Z`;
// [timestamp, visit, event, extra]
const FIXTURE = [
  // October: visit A explores Belgium (clicks twice).
  [mid('2026-10'), A, 'visit', { source: 'innodia.org' }],
  [mid('2026-10'), A, 'explore_click'],
  [mid('2026-10'), A, 'explore_click'],
  [mid('2026-10'), A, 'results_shown', { flow: 'explore', country: 'Belgium', n: 4 }],
  // Visit B searches Spain with results, repeats a click (stored once), goes
  // back to the other branch and gets no results, then results again: each
  // distinct outcome still counts once.
  [mid('2026-10'), B, 'visit', { source: 'direct', utm: 'newsletter' }],
  [mid('2026-10'), B, 'search_click'],
  [mid('2026-10'), B, 'search_branch', { branch: 'without_diagnosis' }],
  [mid('2026-10'), B, 'location_submitted', { country: 'Spain' }],
  [mid('2026-10'), B, 'results_shown', { flow: 'search', country: 'Spain', n: 2 }],
  [mid('2026-10'), B, 'search_click'],
  [mid('2026-10'), B, 'search_branch', { branch: 'with_diagnosis' }],
  [mid('2026-10'), B, 'results_shown', { flow: 'search', country: 'Spain', n: 0 }],
  [mid('2026-10'), B, 'results_shown', { flow: 'search', country: 'Spain', n: 5 }],
  // Visit E starts on 31 Oct 23:59 UTC and clicks on 1 Nov: October only.
  ['2026-10-31T23:59:00Z', E, 'visit', { source: 'direct' }],
  ['2026-11-01T00:01:00Z', E, 'explore_click'],
  // Staff test visit: ignored everywhere.
  [mid('2026-10'), S, 'visit', { source: 'direct', internal: true }],
  [mid('2026-10'), S, 'search_click', { internal: true }],
  // November: visit D is not eligible by age; visit C finds nothing and sends the contact form.
  [mid('2026-11'), D, 'visit', { source: 'other' }],
  [mid('2026-11'), D, 'age_not_eligible'],
  [mid('2026-11'), C, 'visit', { source: 'search_engine' }],
  [mid('2026-11'), C, 'search_click'],
  [mid('2026-11'), C, 'search_branch', { branch: 'with_diagnosis' }],
  [mid('2026-11'), C, 'results_shown', { flow: 'search', country: 'Malta', n: 0 }],
  [mid('2026-11'), C, 'contact_sent'],
];

const EXPECTED_MONTHS = [
  { month: '2026-10', visits: 3, from_innodia: 1, from_direct: 2, from_search_engine: 0, from_other: 0,
    explore_clicks: 2, explore_results: 1, search_clicks: 1, search_with_diagnosis: 1,
    search_without_diagnosis: 1, search_location_entered: 1, search_results: 1, search_no_results: 1,
    search_age_not_eligible: 0, contact_sent: 0 },
  { month: '2026-11', visits: 2, from_innodia: 0, from_direct: 0, from_search_engine: 1, from_other: 1,
    explore_clicks: 0, explore_results: 0, search_clicks: 1, search_with_diagnosis: 1,
    search_without_diagnosis: 0, search_location_entered: 0, search_results: 0, search_no_results: 1,
    search_age_not_eligible: 1, contact_sent: 1 },
];

async function seed(db) {
  await db.query('DROP TABLE IF EXISTS navigator_events');
  await db.query(CREATE_EVENTS_TABLE);
  for (const [ts, v, e, extra = {}] of FIXTURE) {
    const res = await db.query(INSERT_EVENT, insertParams(parseNavigatorEvent({ v, e, ...extra }).row));
    if (res.rowCount) {
      await db.query('UPDATE navigator_events SET created_at = $1 WHERE id = (SELECT max(id) FROM navigator_events)', [ts]);
    }
  }
}

test('monthly report counts visits, not clicks, and skips internal ones', { skip: !url }, async () => {
  const db = new pg.Client({ connectionString: url });
  await db.connect();
  try {
    await seed(db);
    assert.deepEqual((await db.query(MONTHLY_STATS)).rows, EXPECTED_MONTHS);
    assert.deepEqual((await db.query(COUNTRY_STATS)).rows, [
      { flow: 'explore', country: 'Belgium', visits: 1 },
      { flow: 'search', country: 'Malta', visits: 1 },
      { flow: 'search', country: 'Spain', visits: 1 },
    ]);
    assert.deepEqual((await db.query(CAMPAIGN_STATS)).rows, [{ utm_source: 'newsletter', visits: 1 }]);
    const clicks = await db.query(`SELECT count(*)::int AS n FROM navigator_events WHERE visit_id = $1 AND event = 'search_click'`, [B]);
    assert.equal(clicks.rows[0].n, 1, 'repeated event stored once');
  } finally {
    await db.query('DROP TABLE IF EXISTS navigator_events').catch(() => {});
    await db.end();
  }
});
