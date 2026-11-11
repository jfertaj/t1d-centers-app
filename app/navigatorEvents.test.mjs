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
    source: 'innodia.org', utm: 'Newsletter_2026', internal: true, zip: '1000', email: 'x@y.z',
  });
  assert.deepEqual(row, {
    visit_id: V, event: 'results_shown', country: 'Belgium', flow: 'search', branch: null,
    source: 'innodia.org', utm_source: 'newsletter_2026', n_results: 3, internal: true,
  });
});

test('malformed requests are rejected', () => {
  assert.ok(parseNavigatorEvent(null).error);
  assert.ok(parseNavigatorEvent({ v: 'not-hex', e: 'visit' }).error);
  assert.ok(parseNavigatorEvent({ v: V, e: 'drop_table' }).error);
});

test('bad optional values are dropped, not stored', () => {
  const { row } = parseNavigatorEvent({
    v: V, e: 'visit', country: "x'); DROP TABLE y; --", flow: 'admin', branch: 'yes',
    source: 'evil.com', utm: 'a b<script>', n: -1, internal: 'true',
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
    const add = async (month, v, e, extra = {}) => {
      const { row } = parseNavigatorEvent({ v, e, ...extra });
      await db.query(INSERT_EVENT, insertParams(row));
      await db.query(`UPDATE navigator_events SET created_at = $1 WHERE id = (SELECT max(id) FROM navigator_events)`, [`${month}-15T12:00:00Z`]);
    };
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
      { month: '2026-10', visits: 2, from_innodia: 1, from_direct: 1, from_search_engine: 0, from_other: 0,
        explore_clicks: 1, explore_results: 1, search_clicks: 1, search_with_diagnosis: 0,
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
  } finally {
    await db.query('DROP TABLE IF EXISTS navigator_events').catch(() => {});
    await db.end();
  }
});
