import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { handler } from './index.mjs';

const identities = (providerName) => JSON.stringify([{ providerName, userId: 'x' }]);

async function overrideFor(userAttributes, groupsToOverride = []) {
  const event = {
    request: { userAttributes, groupConfiguration: { groupsToOverride, iamRolesToOverride: ['role'], preferredRole: 'role' } },
    response: {},
  };
  const out = await handler(event);
  return out.response.claimsOverrideDetails.groupOverrideDetails;
}
const groupsFor = async (...args) => (await overrideFor(...args)).groupsToOverride;

test('INNODIA Microsoft sign-in with @innodia.org email gets admin', async () => {
  assert.deepEqual(await groupsFor({ email: 'a.b@innodia.org', identities: identities('INNODIA-M365') }), ['admin']);
  assert.deepEqual(await groupsFor({ email: 'A.B@INNODIA.ORG', identities: identities('INNODIA-M365') }), ['admin']);
});

test('existing groups are kept and admin is not duplicated', async () => {
  const m365 = { email: 'a@innodia.org', identities: identities('INNODIA-M365') };
  assert.deepEqual(await groupsFor(m365, ['users']), ['users', 'admin']);
  assert.deepEqual(await groupsFor(m365, ['admin']), ['admin']);
  assert.deepEqual(await groupsFor({ email: 'x@gmail.com' }, ['admin']), ['admin']);
});

test('the email domain alone is not enough', async () => {
  // A native (password) account can claim any email address.
  assert.deepEqual(await groupsFor({ email: 'a@innodia.org' }), []);
  assert.deepEqual(await groupsFor({ email: 'a@innodia.org', identities: identities('Google') }), []);
  assert.deepEqual(await groupsFor({ email: 'a@innodia.org', identities: '{' }), []);
});

test('other domains signing in through the tenant are not admins', async () => {
  // Tenant guests sign in with their home email.
  for (const email of ['x@gmail.com', 'x@evilinnodia.org', 'x@innodia.org.evil.com', '']) {
    assert.deepEqual(await groupsFor({ email, identities: identities('INNODIA-M365') }), [], email);
  }
});

test('the rest of the group config is echoed (a null override would drop groups)', async () => {
  for (const attrs of [{ email: 'a@innodia.org', identities: identities('INNODIA-M365') }, { email: 'x@gmail.com' }]) {
    const out = await overrideFor(attrs);
    assert.deepEqual(out.iamRolesToOverride, ['role']);
    assert.equal(out.preferredRole, 'role');
  }
});

test('group name matches the one the app and API require', () => {
  // The Lambda is zipped alone, so it cannot import lib/groups.ts.
  const groups = readFileSync(new URL('../../lib/groups.ts', import.meta.url), 'utf8');
  assert.match(groups, /export const ADMIN_GROUP = 'admin';/);
});
