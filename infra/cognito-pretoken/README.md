# Cognito pre-token trigger: INNODIA staff are admins

The admin panel and the API require the `admin` group in the Cognito access
token (`middleware.ts`, `app/index.mjs`). This Lambda is the user pool's
**Pre token generation** trigger (event version `V1_0`). It adds `admin` to
`cognito:groups` in the ID and access tokens ("Your `groupOverrideDetails`
object replaces the `cognito:groups` claim in access tokens and ID tokens",
[pre token generation][pretoken]) when all of these hold:

- the user is the federated profile Cognito created for the `INNODIA-M365`
  identity provider (the INNODIA Microsoft 365 tenant): username
  `innodia-m365_<sub>` plus a matching entry in `identities`. "In the Amazon
  Cognito user pools API, you can't sign in users who federate through an IdP"
  ([refresh tokens][refresh]), so this profile only comes from Microsoft. A native
  (password) account linked to the provider keeps its own username, so it is
  not enough to find the provider in `identities` (linked local users can still
  sign in with `InitiateAuth`, [AdminLinkProviderForUser][link]);
- their email ends in `@innodia.org`. A native account can set any email, which
  is why the domain is never checked on its own.

Nobody has to be added to the group by hand.

## Limits (accepted, 2026-11-11)

- The email comes from the Entra `email` claim, of which Microsoft says "Never
  use it for authorization" ([ID token claims][entra]). The owner chose "anyone
  with an @innodia.org account is an admin". Inferred, not verified: tenant
  guests carry their home email, but nothing in Entra forbids an @innodia.org
  email on a non-staff account. For a stricter rule,
  turn on "Assignment required" on the Entra enterprise app and assign only
  staff.
- The user pool sets `AttributesRequireVerificationBeforeUpdate = ["email"]`, so
  a user cannot switch their own email to an @innodia.org address without
  receiving the code at that address ([email verification][verify]). Mapped
  attributes must stay writable: "the mapped attributes must be *writable*", and
  "If your IdP sends a value for a mapped non-writable attribute, Amazon Cognito
  doesn't set the attribute value" ([attribute mapping][mapping]).
- Linking accounts (`AdminLinkProviderForUser`) is an IAM-only admin action.
  Never link a native account whose username starts with `innodia-m365_`: it
  would pass both checks while still signing in with its password.
- The trigger also runs on token refresh (`TokenGeneration_RefreshTokens`,
  [pre token generation][pretoken]) and reads the stored profile. Someone
  disabled in Entra keeps admin until their Cognito refresh token expires
  (`RefreshTokenValidity` on the app client), unless their Cognito user is
  disabled or signed out globally.

## Deploy

Not part of the Amplify build. Deployed by hand:

- Lambda `t1d-centers-cognito-pretoken`, Node.js 20, handler `index.handler`,
  role with `AWSLambdaBasicExecutionRole` only. Lambda and role tagged
  `Project=INNODIA`, `App=t1d-centers-app`.
- Resource policy: `lambda:InvokeFunction` for `cognito-idp.amazonaws.com`,
  scoped to the user pool ARN.
- User pool `LambdaConfig.PreTokenGenerationConfig` =
  `{ "LambdaVersion": "V1_0", "LambdaArn": "<function ARN>" }`.

To update the code:

```sh
cd infra/cognito-pretoken && zip -q /tmp/pretoken.zip index.mjs
aws lambda update-function-code --function-name t1d-centers-cognito-pretoken \
  --zip-file fileb:///tmp/pretoken.zip
```

`aws cognito-idp update-user-pool` resets every setting you leave out to its
default. Build its input from `describe-user-pool`, then diff the before and
after configuration.

## Test

```sh
node --test infra/cognito-pretoken/index.test.mjs
```

[pretoken]: https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-lambda-pre-token-generation.html
[refresh]: https://docs.aws.amazon.com/cognito/latest/developerguide/amazon-cognito-user-pools-using-the-refresh-token.html
[link]: https://docs.aws.amazon.com/cognito-user-identity-pools/latest/APIReference/API_AdminLinkProviderForUser.html
[entra]: https://learn.microsoft.com/en-us/entra/identity-platform/id-token-claims-reference
[verify]: https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-settings-email-phone-verification.html
[mapping]: https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-specifying-attribute-mapping.html
