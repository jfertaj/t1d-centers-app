// /lib/amplify-config.ts
import { Amplify } from 'aws-amplify';

Amplify.configure({
  Auth: {
    region: 'eu-west-1', // ← pon aquí tu región
    userPoolId: 'eu-west-1_XXXXXXXXX', // ← tu User Pool ID
    userPoolWebClientId: 'XXXXXXXXXXXXXXXXXXXXXXXXXX', // ← tu App client ID
    authenticationFlowType: 'USER_PASSWORD_AUTH',
  },
});