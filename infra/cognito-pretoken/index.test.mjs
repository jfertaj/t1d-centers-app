// Run with: node --test infra/cognito-pretoken/index.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { handler } from './index.mjs';

const identities = (providerName) => JSON.stringify([{ providerName, userId: 'x' }]);

async function groupsFor(userAttributes, groupsToOverride = []) {
  const event = {
    request: { userAttributes, groupConfiguration: { groupsToOverride, iamRolesToOverride: [], preferredRole: null } },
    response: {},
  };
  const out = await handler(event);
  return out.response.claimsOverrideDetails.groupOverrideDetails.groupsToOverride;
}

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
