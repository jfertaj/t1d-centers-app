// Usage events from the public Early T1D Navigator (innodia-t1d-navigator.org).
//
// The navigator posts one small event per step (visit, button click, results
// shown...). Nothing identifies a person: no IP, no cookie, no questionnaire
// answers. `visit_id` is a random value that lives only in the page's memory,
// so it groups the events of one page load and is gone when the tab closes.
//
// Kept apart from index.mjs so validation and SQL can be tested without a DB.

export const EVENT_NAMES = new Set([
  'visit',               // page loaded (with where it came from)
  'explore_click',       // "Explore Sites" button
  'search_click',        // "Start search" button
  'search_branch',       // answered "do you have a T1D diagnosis?" (branch only)
  'location_submitted',  // search flow: country + postcode entered
  'results_shown',       // explore or search reached the results screen
  'age_not_eligible',    // search flow: no programme or site for the user's age
  'contact_sent',        // search flow: "no centres found" contact form sent
]);
const FLOWS = new Set(['explore', 'search']);
const BRANCHES = new Set(['with_diagnosis', 'without_diagnosis']);
const SOURCES = new Set(['innodia.org', 'direct', 'search_engine', 'other']);

const VISIT_ID = /^[a-f0-9]{16}$/;

// The navigator's country dropdowns (same list in ExploreSitesFlow and
// BirthAndLocationForm). Anything else is dropped, so no free text is stored.
const COUNTRIES = new Set([
  'Albania', 'Andorra', 'Armenia', 'Austria', 'Azerbaijan', 'Belarus', 'Belgium',
  'Bosnia and Herzegovina', 'Bulgaria', 'Croatia', 'Cyprus', 'Czech Republic', 'Denmark',
  'Estonia', 'Finland', 'France', 'Georgia', 'Germany', 'Greece', 'Hungary', 'Iceland',
  'Ireland', 'Italy', 'Kazakhstan', 'Kosovo', 'Latvia', 'Liechtenstein', 'Lithuania',
  'Luxembourg', 'Malta', 'Moldova', 'Monaco', 'Montenegro', 'Netherlands', 'North Macedonia',
  'Norway', 'Poland', 'Portugal', 'Romania', 'Russia', 'San Marino', 'Serbia', 'Slovakia',
  'Slovenia', 'Spain', 'Sweden', 'Switzerland', 'Turkey', 'Ukraine', 'United Kingdom',
  'Vatican City',
]);

// Campaign names for ?utm_source= links. A link could carry anything (even a
// name), so only these are stored; any other value is recorded as 'other'.
// Add a channel here before using it in a link.
export const CAMPAIGNS = new Set([
  'newsletter', 'email', 'linkedin', 'x', 'twitter', 'facebook', 'instagram', 'bluesky',
  'youtube', 'whatsapp', 'teams', 'slack', 'qr', 'pdf', 'flyer', 'poster', 'presentation',
  'conference', 'webinar', 'partner', 'website', 'press',
]);

const pickEnum = (value, allowed) => (allowed.has(value) ? value : null);

/**
 * Validates a raw event body. Returns { row } to store, or { error } for a
 * malformed request. Unknown optional fields are dropped, never stored.
 */
export function parseNavigatorEvent(body) {
  if (!body || typeof body !== 'object') return { error: 'Invalid body' };
  if (typeof body.v !== 'string' || !VISIT_ID.test(body.v)) return { error: 'Invalid visit id' };
  if (!EVENT_NAMES.has(body.e)) return { error: 'Unknown event' };

  const country = typeof body.country === 'string' ? body.country.trim() : '';
  const utm = typeof body.utm === 'string' ? body.utm.trim().toLowerCase() : '';
  const campaign = utm ? (CAMPAIGNS.has(utm) ? utm : 'other') : null;
  const n = Number.isInteger(body.n) && body.n >= 0 && body.n <= 10000 ? body.n : null;

  return {
    row: {
      visit_id: body.v,
      event: body.e,
      country: COUNTRIES.has(country) ? country : null,
      flow: pickEnum(body.flow, FLOWS),
      branch: pickEnum(body.branch, BRANCHES),
      source: pickEnum(body.source, SOURCES),
      utm_source: campaign,
      n_results: n,
      internal: body.internal === true,
    },
  };
}

export const CREATE_EVENTS_TABLE = `
  CREATE TABLE IF NOT EXISTS navigator_events (
    id          bigserial PRIMARY KEY,
    created_at  timestamptz NOT NULL DEFAULT now(),
    visit_id    text NOT NULL,
    event       text NOT NULL,
    country     text,
    flow        text,
    branch      text,
    source      text,
    utm_source  text,
    n_results   integer,
    internal    boolean NOT NULL DEFAULT false
  );
  CREATE INDEX IF NOT EXISTS navigator_events_created_at_idx ON navigator_events (created_at);
  -- One row per visit, event, flow and country: repeats add nothing to the
  -- report, so they are not stored (bounds what one page load can write).
  CREATE UNIQUE INDEX IF NOT EXISTS navigator_events_once_idx
    ON navigator_events (visit_id, event, (coalesce(flow, '')), (coalesce(country, '')));
`;

export const INSERT_EVENT = `
  INSERT INTO navigator_events (visit_id, event, country, flow, branch, source, utm_source, n_results, internal)
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
  ON CONFLICT DO NOTHING
`;
export const insertParams = (r) =>
  [r.visit_id, r.event, r.country, r.flow, r.branch, r.source, r.utm_source, r.n_results, r.internal];

// Every count is "visits (page loads) in which this happened", so a visitor who
// clicks the same button twice in one visit counts once. A visit belongs to the
// month (UTC) of its first event, so one crossing midnight on the last day of a
// month is not split. Staff visits marked internal are excluded.
const visitsWhere = (cond) => `COUNT(DISTINCT e.visit_id) FILTER (WHERE ${cond})::int`;
export const MONTHLY_STATS = `
  WITH visit_month AS (
    SELECT visit_id, to_char(min(created_at) AT TIME ZONE 'UTC', 'YYYY-MM') AS month
    FROM navigator_events
    WHERE NOT internal
    GROUP BY visit_id
  )
  SELECT v.month,
    ${visitsWhere(`event = 'visit'`)} AS visits,
    ${visitsWhere(`event = 'visit' AND source = 'innodia.org'`)} AS from_innodia,
    ${visitsWhere(`event = 'visit' AND source = 'direct'`)} AS from_direct,
    ${visitsWhere(`event = 'visit' AND source = 'search_engine'`)} AS from_search_engine,
    ${visitsWhere(`event = 'visit' AND source = 'other'`)} AS from_other,
    ${visitsWhere(`event = 'explore_click'`)} AS explore_clicks,
    ${visitsWhere(`event = 'results_shown' AND flow = 'explore'`)} AS explore_results,
    ${visitsWhere(`event = 'search_click'`)} AS search_clicks,
    ${visitsWhere(`event = 'search_branch' AND branch = 'with_diagnosis'`)} AS search_with_diagnosis,
    ${visitsWhere(`event = 'search_branch' AND branch = 'without_diagnosis'`)} AS search_without_diagnosis,
    ${visitsWhere(`event = 'location_submitted'`)} AS search_location_entered,
    ${visitsWhere(`event = 'results_shown' AND flow = 'search' AND n_results >= 0`)} AS search_results,
    ${visitsWhere(`event = 'results_shown' AND flow = 'search' AND n_results = 0`)} AS search_no_results,
    ${visitsWhere(`event = 'age_not_eligible'`)} AS search_age_not_eligible,
    ${visitsWhere(`event = 'contact_sent'`)} AS contact_sent
  FROM navigator_events e
  JOIN visit_month v USING (visit_id)
  WHERE NOT e.internal
  GROUP BY 1
  ORDER BY 1
`;

// All-time totals (the report shows months only in the main table).
export const COUNTRY_STATS = `
  SELECT flow, country, COUNT(DISTINCT visit_id)::int AS visits
  FROM navigator_events
  WHERE NOT internal AND event = 'results_shown' AND country IS NOT NULL
  GROUP BY 1, 2
  ORDER BY 3 DESC, 1, 2
  LIMIT 120
`;

export const CAMPAIGN_STATS = `
  SELECT utm_source, COUNT(DISTINCT visit_id)::int AS visits
  FROM navigator_events
  WHERE NOT internal AND event = 'visit' AND utm_source IS NOT NULL
  GROUP BY 1
  ORDER BY 2 DESC, 1
  LIMIT 50
`;
