## Why

The project has no committed tests. The only regression suite that ever existed
for `create_order` was typed into a SQL editor by an agent, run against the live
database, and thrown away, so every later change re-verified the order path by
hand through a browser. That is now the slowest part of shipping, and the promo
code bug fixed in `6c70104` is exactly the kind of regression a cheap test would
have caught.

Tests need somewhere to write. The user's decision is to run them against the
existing Supabase project rather than stand up a throwaway one, which means the
database has to be able to tell a test order from a real one so a failed run
cannot leave rows that look like business a staff member should act on.

## What Changes

- Add a boolean `is_test` column to `public.orders`, defaulting to `false`, and
  return it through `create_order` so a caller can mark the order it creates.
- Exclude test orders from the staff notification email, so a test run does not
  put fake orders in the owner's inbox.
- Add Vitest and a `npm test` script, plus unit tests for the four server
  utilities that hold the pricing rules: `pricing.ts`, `promo.ts`,
  `rate-limit.ts` and `schemas.ts`.
- Add integration tests that call `create_order` and `POST /api/orders` against
  the live Supabase project, each marking its rows `is_test` and deleting them
  in teardown.
- Add a Playwright end-to-end test covering cart through placed order, including
  the rejected-promo-code clear from `6c70104`.
- Add a smoke test that asserts the production `/api/products` and
  `/api/store-settings` return 200, so an empty environment variable cannot go
  unnoticed the way it did on 2026-09-10.

## Non-goals

- No CI pipeline. The suite runs locally with `npm test`; wiring it to GitHub
  Actions or Vercel is a separate change.
- No throwaway or branched Supabase project. The user chose the existing one.
- No test coverage target, and no tests for the assistant's provider calls,
  which cost money per run.
- No change to how orders are priced, notified or displayed beyond the test
  exclusion above.

## Capabilities

### New Capabilities

- `ordering/test-order`: what marks an order as a test, what the system must do
  differently for one, and the guarantee that a test order never reaches staff.

### Modified Capabilities

- `ordering/order-notification`: the committed order gains a test marker, and
  the staff notification is not sent for an order carrying it.

## Impact

- **Supabase schema and RLS**: `public.orders` gains an `is_test boolean not
  null default false` column, and the `create_order` function signature gains a
  matching parameter. This is a migration against the live project; existing
  rows take the `false` default. No RLS policy changes, because `orders` is
  reached only through the service-role key.
- `supabase/schema.sql`, and a new migration applied through the Supabase MCP
  server.
- `server/api/orders.post.ts` and `server/utils/email.ts` for the notification
  skip.
- `package.json` gains `vitest` and `@playwright/test` as dev dependencies and a
  `test` script. Installs still need `--legacy-peer-deps`.
- A new `tests/` directory at the repo root, and `.gitignore` entries for
  Playwright's report output.
