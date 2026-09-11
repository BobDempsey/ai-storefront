## 1. Decide the marker separately from the exemption

- [x] 1.1 Split `isTest` in `server/api/orders.post.ts` into the secret check, which keeps the rate-limit exemption, and the marker, which is the secret check or a non-production deployment, verifying `npm run build` passes
- [x] 1.2 Resolve the environment with `resolveDeployEnv` from `app/utils/deploy-env.ts` against the server's own runtime config, ignoring `import.meta.dev`, and rewrite the comment that says the build environment must not decide this so it records why that reasoning does not apply here

## 2. Pin it

- [x] 2.1 Add unit tests over the route: a dev deployment marks an order without any header, a preview does too, and production with no header does not
- [x] 2.2 Verify with a unit test that a request cannot claim an environment, by sending headers and body fields naming one against a production config
- [x] 2.3 Verify with a unit test that a non-production order without the secret is still rate-limited, and that one with the secret is still exempt
- [x] 2.4 Verify with a unit test that a non-production order sends no staff notification

## 3. Finish

- [x] 3.1 Place an order on a running dev server and verify the row records `is_test` and no staff email was sent, then delete the row
- [x] 3.2 Verify `npm test`, `npm run build`, `npm run test:e2e` and `npm run test:smoke` all pass
- [x] 3.3 Record the change in `handoff.md`, including why the original "not the build environment" decision does not cover this
