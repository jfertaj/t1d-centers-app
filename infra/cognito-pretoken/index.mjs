// Cognito Pre token generation (V1).
// Anyone who signs in through the INNODIA Microsoft 365 tenant (IdP
// INNODIA-M365) with an @innodia.org email gets the `admin` group in their ID
// and access tokens. See README.md for why each check is needed.
const ADMIN_GROUP = 'admin';
const PROVIDER = 'INNODIA-M365';
const DOMAIN = '@innodia.org';

// The user profile must be the federated one Cognito creates for this IdP
// (username `<provider>_<sub>`, lower-cased). Such users can only sign in
// through the IdP. A native account linked to the IdP keeps its own username
// and could still sign in with its password, so `identities` alone is not
// proof that this login went through Microsoft.
function isInnodiaFederatedUser(userName, attrs) {
  if (!String(userName || '').toLowerCase().startsWith(`${PROVIDER.toLowerCase()}_`)) return false;
  try {
    return JSON.parse(attrs.identities || '[]').some((i) => i.providerName === PROVIDER);
  } catch {
    return false;
  }
}

export const handler = async (event) => {
  const attrs = event.request?.userAttributes || {};
  const current = event.request?.groupConfiguration || {};
  const groups = current.groupsToOverride || [];
  const email = String(attrs.email || '').trim().toLowerCase();
  const grant = isInnodiaFederatedUser(event.userName, attrs) && email.endsWith(DOMAIN) && !groups.includes(ADMIN_GROUP);
  // Always echo the request's group config: a null override suppresses groups.
  event.response = {
    claimsOverrideDetails: {
      groupOverrideDetails: { ...current, groupsToOverride: grant ? [...groups, ADMIN_GROUP] : groups },
    },
  };
  return event;
};
