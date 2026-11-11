# Cognito pre-token trigger: INNODIA staff are admins

The admin panel and the API require the `admin` group in the Cognito access
token (`middleware.ts`, `app/index.mjs`). This Lambda is the user pool's
**Pre token generation** trigger (event version `V1_0`). It adds `admin` to
`cognito:groups` in the ID and access tokens when both of these hold:

- the user signed in through the `INNODIA-M365` identity provider (the INNODIA
  Microsoft 365 tenant), read from the `identities` attribute;
- their email ends in `@innodia.org`.

The domain alone is not trusted: a native (password) account can set any email.
Guests of the tenant sign in with their home email, so they are not admins.

Nobody has to be added to the group by hand. The trigger also runs on token
refresh, so changes reach signed-in users within an access-token lifetime.

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
