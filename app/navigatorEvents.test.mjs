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

test('monthly report counts visits, not clicks, and skips internal ones', { skip: !url }, async () => {
  const db = new pg.Client({ connectionString: url });
  await db.connect();
  try {
    await db.query('DROP TABLE IF EXISTS navigator_events');
    await db.query(CREATE_EVENTS_TABLE);
    const addAt = async (ts, v, e, extra = {}) => {
      const { row } = parseNavigatorEvent({ v, e, ...extra });
      const res = await db.query(INSERT_EVENT, insertParams(row));
      if (res.rowCount) await db.query(`UPDATE navigator_events SET created_at = $1 WHERE id = (SELECT max(id) FROM navigator_events)`, [ts]);
    };
    const add = (month, v, e, extra) => addAt(`${month}-15T12:00:00Z`, v, e, extra);
    const a = 'aaaaaaaaaaaaaaaa', b = 'bbbbbbbbbbbbbbbb', c = 'cccccccccccccccc', s = 'ffffffffffffffff';
    // October: visit a explores Belgium (clicks twice), visit b searches with results in Spain.
    await add('2026-10', a, 'visit', { source: 'innodia.org' });
    await add('2026-10', a, 'explore_click');
    await add('2026-10', a, 'explore_click');
    await add('2026-10', a, 'results_shown', { flow: 'explore', country: 'Belgium', n: 4 });
    await add('2026-10', b, 'visit', { source: 'direct', utm: 'newsletter' });
    await add('2026-10', b, 'search_click');
    await add('2026-10', b, 'search_branch', { branch: 'without_diagnosis' });
    await add('2026-10', b, 'location_submitted', { country: 'Spain' });
    await add('2026-10', b, 'results_shown', { flow: 'search', country: 'Spain', n: 2 });
    // Repeats in the same visit are stored once.
    await add('2026-10', b, 'search_click');
    // Visit e starts on 31 Oct 23:59 UTC and clicks on 1 Nov: counted in October only.
    const e = 'eeeeeeeeeeeeeeee';
    await addAt('2026-10-31T23:59:00Z', e, 'visit', { source: 'direct' });
    await addAt('2026-11-01T00:01:00Z', e, 'explore_click');
    // Staff test visit: ignored everywhere.
    await add('2026-10', s, 'visit', { source: 'direct', internal: true });
    await add('2026-10', s, 'search_click', { internal: true });
    // November: visit d is too old/young for any programme in its country.
    await add('2026-11', 'dddddddddddddddd', 'visit', { source: 'other' });
    await add('2026-11', 'dddddddddddddddd', 'age_not_eligible');
    // November: visit c searches, finds nothing, sends the contact form.
    await add('2026-11', c, 'visit', { source: 'search_engine' });
    await add('2026-11', c, 'search_click');
    await add('2026-11', c, 'search_branch', { branch: 'with_diagnosis' });
    await add('2026-11', c, 'results_shown', { flow: 'search', country: 'Malta', n: 0 });
    await add('2026-11', c, 'contact_sent');

    const { rows } = await db.query(MONTHLY_STATS);
    assert.deepEqual(rows, [
      { month: '2026-10', visits: 3, from_innodia: 1, from_direct: 2, from_search_engine: 0, from_other: 0,
        explore_clicks: 2, explore_results: 1, search_clicks: 1, search_with_diagnosis: 0,
        search_without_diagnosis: 1, search_location_entered: 1, search_results: 1, search_no_results: 0,
        search_age_not_eligible: 0, contact_sent: 0 },
      { month: '2026-11', visits: 2, from_innodia: 0, from_direct: 0, from_search_engine: 1, from_other: 1,
        explore_clicks: 0, explore_results: 0, search_clicks: 1, search_with_diagnosis: 1,
        search_without_diagnosis: 0, search_location_entered: 0, search_results: 0, search_no_results: 1,
        search_age_not_eligible: 1, contact_sent: 1 },
    ]);
    assert.deepEqual((await db.query(COUNTRY_STATS)).rows, [
      { flow: 'explore', country: 'Belgium', visits: 1 },
      { flow: 'search', country: 'Malta', visits: 1 },
      { flow: 'search', country: 'Spain', visits: 1 },
    ]);
    assert.deepEqual((await db.query(CAMPAIGN_STATS)).rows, [{ utm_source: 'newsletter', visits: 1 }]);
    const clicks = await db.query(`SELECT count(*)::int AS n FROM navigator_events WHERE visit_id = $1 AND event = 'search_click'`, [b]);
    assert.equal(clicks.rows[0].n, 1, 'repeated event stored once');
  } finally {
    await db.query('DROP TABLE IF EXISTS navigator_events').catch(() => {});
    await db.end();
  }
});
