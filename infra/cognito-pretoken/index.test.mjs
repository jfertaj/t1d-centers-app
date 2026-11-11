import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { handler } from './index.mjs';

const identities = (providerName) => JSON.stringify([{ providerName, userId: 'x' }]);

const FED = 'innodia-m365_abc123';

async function overrideFor(userAttributes, groupsToOverride = [], userName = FED) {
  const event = {
    userName,
    request: { userAttributes, groupConfiguration: { groupsToOverride, iamRolesToOverride: ['role'], preferredRole: 'role' } },
    response: {},
  };
  const out = await handler(event);
  return out.response.claimsOverrideDetails.groupOverrideDetails;
}
const groupsFor = async (...args) => (await overrideFor(...args)).groupsToOverride;
const m365 = (email) => ({ email, identities: identities('INNODIA-M365') });

test('INNODIA Microsoft sign-in with @innodia.org email gets admin', async () => {
  assert.deepEqual(await groupsFor({ email: 'a.b@innodia.org', identities: identities('INNODIA-M365') }), ['admin']);
  assert.deepEqual(await groupsFor({ email: 'A.B@INNODIA.ORG', identities: identities('INNODIA-M365') }), ['admin']);
});

test('existing groups are kept and admin is not duplicated', async () => {
  const m365 = { email: 'a@innodia.org', identities: identities('INNODIA-M365') };
  assert.deepEqual(await groupsFor(m365, ['users']), ['users', 'admin']);
  assert.deepEqual(await groupsFor(m365, ['admin']), ['admin']);
  assert.deepEqual(await groupsFor({ email: 'x@gmail.com' }, ['admin'], 'native-user'), ['admin']);
});

test('a native account linked to the IdP does not get admin', async () => {
  // It keeps its own username and can still sign in with its password.
  assert.deepEqual(await groupsFor(m365('a@innodia.org'), [], 'native.user'), []);
  assert.deepEqual(await groupsFor(m365('a@innodia.org'), [], ''), []);
  // A native username that merely looks like the federated prefix.
  assert.deepEqual(await groupsFor({ email: 'a@innodia.org' }, [], FED), []);
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
  const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
  assert.match(read('lib/groups.ts'), /export const ADMIN_GROUP = 'admin';/);
  assert.match(read('app/index.mjs'), /claimGroups\(claims\)\.includes\('admin'\)/);
});
