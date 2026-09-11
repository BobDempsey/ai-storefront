## 1. Schema: mark an order as a test

- [x] 1.1 Apply a migration adding `is_test boolean not null default false` to `public.orders`, and verify with a query that the column exists and every existing row reads `false`
- [x] 1.2 `create or replace` `public.create_order` with a trailing `p_is_test boolean default false` that writes the column, and verify a three-argument call still commits an order recorded as not a test
- [x] 1.3 Verify a four-argument call with `p_is_test => true` commits an order recorded as a test, with its line items and total identical to the same cart placed as a real order
- [x] 1.4 Mirror the column and the new function signature into `supabase/schema.sql`, and verify the file's `create_order` matches what the live database reports

## 2. Withhold the staff notification for a test order

- [x] 2.1 Add `NUXT_TEST_ORDER_TOKEN` to `runtimeConfig`, `.env` and `.env.example`, and verify an unset token leaves the server unable to create a test order
- [x] 2.2 Have `server/api/orders.post.ts` pass `p_is_test` only when the request's `x-test-order-token` matches the configured token, and verify a wrong or missing token produces an ordinary order rather than an error
- [x] 2.3 Skip the notification send when the order is a test, and verify by placing a test order that no Resend call is made
- [x] 2.4 Verify the response for a test order reports the order as placed with no email failure, and that a real order still sends and still reports a send failure as it did before

## 3. Test tooling

- [x] 3.1 Add `vitest` as a dev dependency with `npm install --legacy-peer-deps`, add a `test` script, and verify `npm test` runs and reports zero tests
- [x] 3.2 Split the runner config so unit tests are the default run and the database, e2e and smoke files are opt-in, and verify `npm test` touches no network
- [x] 3.3 Add `@playwright/test` and its config, and verify `npx playwright test --list` enumerates the e2e file
- [x] 3.4 Add Playwright's report output to `.gitignore`, and verify `git status` is clean after a run

## 4. Unit tests

- [x] 4.1 Test `server/utils/pricing.ts` covering sale math, rounding at the cent boundary, and `withSalePricing` when no sale is active; verify all pass
- [x] 4.2 Test `server/utils/promo.ts` covering code normalisation, percent discount, an inactive code and an unknown code; verify all pass
- [x] 4.3 Test `server/utils/rate-limit.ts` covering bucket keys, window rollover and that the `chat:` bucket is isolated from the order bucket; verify all pass
- [x] 4.4 Test `server/utils/schemas.ts` covering a valid and an invalid payload for the order, contact and opt-in schemas; verify all pass

## 5. Integration tests against the live project

- [x] 5.1 Add a Supabase test client reading `.env`, plus a start-of-suite sweep deleting `is_test` orders older than an hour, and verify the sweep removes a deliberately stranded row
- [x] 5.2 Add an `afterEach` teardown deleting each order the test created, and verify `order_items` and `promo_redemptions` rows go with it through the cascade
- [x] 5.3 Test `create_order` directly: a plain order, one priced by the store-wide sale, and one priced by a promo code; verify each records the discount detail the `ordering/order-notification` spec requires
- [x] 5.4 Test `POST /api/orders` against a running dev server for the happy path, a rejected promo code, and an unavailable product; verify each response and that every row created is cleaned up

## 6. End-to-end

- [x] 6.1 Add a Playwright test walking cart to placed order, and verify it passes against `npm run dev`
- [x] 6.2 Extend it to apply an unrecognised promo code, and verify the field clears and the following Submit places the order at the sale price on the first try
- [x] 6.3 Verify the orders the e2e run creates are marked as tests and removed afterwards

## 7. Smoke test and handoff

- [x] 7.1 Add an opt-in smoke test asserting production `/api/products` and `/api/store-settings` return 200 against the production alias, and verify it passes now and fails when pointed at an unset environment
- [x] 7.2 Record in `handoff.md` that test orders live in the live database, that staff must filter on `is_test`, and how to run each part of the suite
