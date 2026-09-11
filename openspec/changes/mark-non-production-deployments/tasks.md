## 1. Name the environment

- [x] 1.1 Add `deployEnv` to the public runtime config in `nuxt.config.ts`, defaulting to empty, and verify `npm run build` passes
- [x] 1.2 Add `NUXT_PUBLIC_DEPLOY_ENV` to `.env` as `development` and to `.env.example` commented as optional, verifying the dev server reads it

## 2. Show it

- [x] 2.1 Resolve the environment in `app/layouts/default.vue` from the config value, falling back to `development` under `import.meta.dev`, treating unset and `production` as the live shop, verified by unit tests over the resolver
- [x] 2.2 Render a bar above the header naming the environment, and verify it covers no control by placing an order on a marked dev server
- [x] 2.3 Prefix the existing `titleTemplate` with the environment name and verify the tab title carries it
- [x] 2.4 Verify the bar is legible in both colour schemes and at 390px width

## 3. Keep the live shop unmarked

- [x] 3.1 Verify with unit tests that an unset value and `production` both resolve to no marker
- [x] 3.2 Add an assertion to `tests/smoke/production.test.ts` that the live domain serves no marker, and verify `npm run test:smoke` passes against it
- [x] 3.3 Add an end-to-end test that the marker shows on the dev server and that checkout still works with it, and verify `npm run test:e2e` passes

## 4. Tell the next person

- [x] 4.1 Set `NUXT_PUBLIC_DEPLOY_ENV` to `preview` on Vercel Preview and verify `vercel env ls preview` lists it
- [x] 4.2 Add a line to the README's going-live section and record the change in `handoff.md`
- [x] 4.3 Verify `npm test`, `npm run build`, `npm run test:e2e` and `npm run test:smoke` all pass
