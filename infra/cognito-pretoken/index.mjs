// Cognito Pre token generation (V1).
// Anyone who signs in through the INNODIA Microsoft 365 tenant (IdP
// INNODIA-M365) with an @innodia.org email gets the `admin` group in their ID
// and access tokens. Both conditions are required: the domain alone is not
// proof, because a native (password) account can claim any email.
const ADMIN_GROUP = 'admin';
const PROVIDER = 'INNODIA-M365';
const DOMAIN = '@innodia.org';

function signedInWithInnodia(attrs) {
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
  const grant = signedInWithInnodia(attrs) && email.endsWith(DOMAIN) && !groups.includes(ADMIN_GROUP);
  // Always echo the request's group config: a null override suppresses groups.
  event.response = {
    claimsOverrideDetails: {
      groupOverrideDetails: { ...current, groupsToOverride: grant ? [...groups, ADMIN_GROUP] : groups },
    },
  };
  return event;
};
