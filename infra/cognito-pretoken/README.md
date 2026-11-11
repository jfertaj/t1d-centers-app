# Cognito pre-token trigger: INNODIA staff are admins

The admin panel and the API require the `admin` group in the Cognito access
token (`middleware.ts`, `app/index.mjs`). This Lambda is the user pool's
**Pre token generation** trigger (event version `V1_0`). It adds `admin` to
`cognito:groups` in the ID and access tokens when all of these hold:

- the user is the federated profile Cognito created for the `INNODIA-M365`
  identity provider (the INNODIA Microsoft 365 tenant): username
  `innodia-m365_<sub>` plus a matching entry in `identities`. Federated users
  cannot sign in through the Cognito API, only through Microsoft. A native
  (password) account linked to the provider keeps its own username, so it is
  not enough to find the provider in `identities`;
- their email ends in `@innodia.org`. A native account can set any email, which
  is why the domain is never checked on its own.

Nobody has to be added to the group by hand.

## Limits (accepted, 2026-11-11)

- The email comes from the Entra `email` claim, which Microsoft says not to use
  for authorization. The owner chose "anyone with an @innodia.org account is an
  admin". Tenant guests normally carry their home email, but nothing in Entra
  forbids an @innodia.org email on a non-staff account. For a stricter rule,
  turn on "Assignment required" on the Entra enterprise app and assign only
  staff.
- The user pool sets `AttributesRequireVerificationBeforeUpdate = ["email"]`, so
  a user cannot switch their own email to an @innodia.org address without
  receiving the code at that address. Mapped attributes must stay writable by
  the app client, or Cognito does not store the email Microsoft sends.
- The trigger also runs on token refresh and reads the stored profile. Someone
  disabled in Entra keeps admin until their Cognito refresh token expires
  (`RefreshTokenValidity` on the app client), unless their Cognito user is
  disabled or signed out globally.

## Deploy

Not part of the Amplify build. Deployed by hand:

- Lambda `t1d-centers-cognito-pretoken`, Node.js 20, handler `index.handler`,
  role with `AWSLambdaBasicExecutionRole` only.
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
