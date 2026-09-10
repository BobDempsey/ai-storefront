## Context

See proposal.md for motivation. The constraints that shape the approach:

- Tests run against the live Supabase project, by the user's decision. There is
  no second project and no local Postgres, so integration tests write real rows
  to the same tables the storefront reads.
- `public.create_order(p_customer jsonb, p_items jsonb, p_promo_code text)` is
  the only path that commits an order. It is `security definer` and does the
  pricing itself, so a test cannot construct an order any other way without
  testing something other than what production does.
- All order writes go through the service-role key, so RLS is not in the path
  and cannot be used to fence tests off.
- The staff notification is the side effect that escapes the database. It sends
  through Resend to a real inbox the owner reads.
- `npm install` needs `--legacy-peer-deps` on this Nuxt version, which
  constrains how test tooling is added.

## Goals / Non-Goals

**Goals:**

- A test run leaves the database in the state it found, and leaves nothing a
  staff member could mistake for business.
- The order tests exercise the real `create_order`, not a reimplementation.
- The unit tests need no network and no database, so they stay fast enough to
  run on every save.

**Non-Goals:**

- Isolation between concurrent test runs. One developer runs the suite at a
  time; two simultaneous runs may collide on promo redemptions, and that is
  accepted rather than designed around.
- Snapshot and restore of the database. Cleanup is per-test teardown.

## Decisions

**A column on `orders`, not a magic value in an existing field.**
`is_test boolean not null default false`. The alternative the user first
suggested, `status = 'test'`, needs no migration but overloads a column that
already means where the order is in fulfilment, so a test order would have to
give up having a status at all. A reserved email domain was also considered and
rejected: it is invisible to a query that groups by anything else, and it
collides with the promo-redemption uniqueness that is keyed on email. A real
column can be excluded with `where not is_test` and defaults correctly for every
caller that does not know about it.

**`create_order` gains `p_is_test boolean default false` as its last
parameter.** Defaulting it keeps every existing call site compiling unchanged,
including the one in `server/api/orders.post.ts`, and keeps the storefront
unable to create a test order by accident. Postgres resolves the call by name
through PostgREST, so adding a defaulted trailing parameter does not break the
existing three-argument call.

**A request declares a test order with a shared secret, not with the build
environment.** `POST /api/orders` reads `NUXT_TEST_ORDER_TOKEN` from
`runtimeConfig` and treats a request as a test only when its
`x-test-order-token` header matches. Gating on "not production" was considered
and rejected: it would mean production runs a different branch than any test
ever exercises, which is the failure mode the whole suite exists to prevent.
An unset or mismatched token yields an ordinary order rather than a rejection,
so the flag can never turn a real customer's checkout into an error. The token
is server-only, so it never reaches the browser and a visitor cannot use it to
mute the staff notification.

**A token-bearing request skips the rate limiter as well as the
notification.** The route allows five orders per IP per ten minutes and counts
refusals too. The database tests place three and the browser tests two, from
the same address, so a single `npm run test:db && npm run test:e2e` exhausts
the allowance and the next run fails on a 429 that says nothing about the code.
Raising the limit was rejected: that changes what real customers get. The token
is already the trust boundary for marking an order, and it is unset in
production, so nothing there takes this branch.

**The notification is skipped in the API route, not inside the email module.**
`server/api/orders.post.ts` already decides whether to send and how to report a
send failure. Putting the check there keeps `server/utils/email.ts` a dumb
sender with one job, and keeps the "a test order is not a partial failure" rule
next to the code that would otherwise report the partial failure.

**Vitest for unit and integration tests, Playwright for end-to-end.** Vitest is
already implied by the Vite toolchain Nuxt ships, so it needs no separate
transform config for the TypeScript server utilities. Playwright is already
present on this machine through the MCP server used for browser verification,
and the promo-code fix in `6c70104` was verified through it, so the e2e test
encodes a check that was previously done by hand in the same tool. Jest was not
considered seriously: it would need its own ESM and TypeScript setup against a
Vite project.

**Integration tests own their rows and delete them in teardown.** Each test
creates its order with `p_is_test => true`, keeps the returned id, and deletes
the order in an `afterEach` that runs whether or not the test passed.
`order_items` and `promo_redemptions` both cascade on `orders.id`, so deleting
the order is sufficient. A sweep for stray `is_test` rows older than an hour
runs at the start of the suite, so a crashed run cannot accumulate rows
forever.

**The smoke test targets the production alias, not a per-deployment URL.**
`https://ecommerce-store-theta-sable.vercel.app` is reachable without a signed-in
browser; the per-deployment URLs answer Vercel's deployment-protection login page
to anything else, which would make the smoke test assert on a login screen.

## Risks / Trade-offs

- **A failed run leaves rows in the live `orders` table.** → Teardown runs in
  `afterEach` rather than at the end of the file, so one failing test does not
  strand the rest; the start-of-suite sweep catches what a hard crash leaves.
- **Test orders distort any count or revenue total staff read from the
  dashboard.** → The marker exists precisely so those reads can exclude it, but
  the Supabase dashboard's own default views will not. Staff need to know to
  filter, which belongs in the handoff.
- **Promo-redemption uniqueness is keyed on code and email**, so a test that
  redeems `WELCOME25` twice with the same address fails the second time even
  after cleanup if teardown did not run. → Tests that touch promo codes
  generate a unique address per run.
- **A migration against the live database with no staging step.** → The change
  is additive with a default, so it cannot fail on existing rows, and the
  rollback is dropping the column. `create_order` is replaced, not dropped, so
  there is no window where it does not exist.
- **The smoke test depends on the deployed site and the network**, so it fails
  for reasons unrelated to the code under test. → It goes in its own file that
  is excluded from the default `npm test` run and invoked explicitly.

## Migration Plan

1. Apply the migration through the Supabase MCP server: add the column, then
   `create or replace` `create_order` with the new trailing parameter.
2. Mirror both into `supabase/schema.sql` so a fresh project matches.
3. Rollback is `alter table public.orders drop column is_test` plus restoring
   the three-argument `create_order` from git history.
