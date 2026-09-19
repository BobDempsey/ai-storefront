# Design

## Context

See `proposal.md` for why. What shapes the approach here is the tooling actually
on this machine and the state the shop is in.

The shop is down. `wfhhkdmgouyxnrxnbaeo` is `INACTIVE` in Supabase's Management
API and its hostname does not resolve, so nothing can read a row out of it until
someone restores it from the dashboard. `fif.bobdempsey83.com` serves its shell
and 502s the catalogue.

The code that does the work already exists and is proven. `6f19869` on `main`
put `NUXT_DATABASE_BACKEND` in front of a backend interface with two
implementations, and the demo has run on it live since 2026-09-18. `fif` does
not have that commit: `git branch --contains 6f19869` lists `main` only.

No Postgres client tools are installed. `psql`, `pg_dump` and the Supabase CLI
are all absent, and so is Docker, which is why the Neon path through
`npm run db:types` already fails with `LegacyDockerRunError`. `neon` and `node`
are present. Whatever moves the rows has to run in Node.

The credentials are split. Local `.env` names the demo's Supabase project;
Forged in Filament's URL and service key live on its Vercel project and in the
dashboard, and `SUPABASE_ACCESS_TOKEN` is a read-only Management API token
scoped to this one project, which can see that the project is paused and cannot
read a table.

## Goals / Non-Goals

**Goals:**

- Take the backend switch by cherry-pick, so `fif` runs the template's code
  rather than a second copy of it.
- Move the shop's rows with their ids and timestamps, using only what is already
  installed.
- Leave the Supabase project a working rollback that costs one variable.
- Prove the move on the live shop, not only in the test suite.

**Non-Goals:**

- Writing any new backend code. If `git diff` after the pick touches anything
  outside what `6f19869` touched, the pick went wrong.
- Zero downtime. The shop is already down; a cutover window costs nothing here
  and a dual-write scheme would cost a great deal.
- A reusable migration tool. One script, run twice at most, then archived with
  the change.

## Decisions

**Cherry-pick `6f19869` rather than re-implement.** `fif` is meant to receive
template fixes this way and never merge back, and this one was cherry-picked
clean once before (`name-the-shop-in-every-email`). The alternative, writing the
shim again on this branch, gives two implementations of one interface that drift
apart, which is exactly what the branch strategy exists to avoid. The risk is a
conflict in `supabase/schema.sql`, where the RLS lines move out into
`supabase/rls.sql`; resolve by taking `main`'s version of both files, since
neither has diverged on this branch.

**Read out through `supabase-js`, not through Postgres.** Reading rows needs
either the database password, which nobody has to hand, or the service key,
which the shop's Vercel project already holds and which bypasses RLS. The second
needs no new credential and no client tools. The cost is PostgREST's default
page size of 1000 rows: the script has to range explicitly rather than assume one
request returns a table. Rejected: installing the Postgres client tools for
`pg_dump`, which is a bigger ask than a fifty-line script, and the Supabase CLI's
`db dump`, which wants Docker.

**Write into Neon with `@neondatabase/serverless`.** It arrives with the
cherry-pick, so the script adds no dependency. Inserts go table by table in
foreign-key order, ids and timestamps written explicitly rather than left to
defaults, and each table in one transaction so a half-copied table is not a
state anyone has to reason about.

**Order the tables by their foreign keys and copy them whole.** `products` and
`promo_codes` first, then `orders`, then `order_items` and `promo_redemptions`,
then `email_subscribers`, which depends on nothing. Copying `products` matters
even though the catalogue is still the seeded fifteen: `order_items` references
it, and an order whose product row is missing is a broken record rather than a
tidied one.

**Compare counts per table before calling the move done.** A count is cheap,
catches the page-size trap, and is the one check that fails loudly when the
script silently copied the first thousand of something. Contents are compared
too, by the same md5-over-columns approach `scripts/compare-schemas.mjs` already
uses for schema.

**Cut over by variable, not by DNS.** `NUXT_DATABASE_BACKEND=neon` plus the
connection string on the `forged-in-filament` project's Production and Preview,
then redeploy. The domain, the certificate and the Vercel project all stay
exactly as they are. Rolling back is the same two fields set the other way.

**Keep the Supabase project after the cutover.** Freeing the second free-plan
slot is what this work is ultimately for, but releasing it while the shop has run
on Neon for minutes is trading a known rollback for a slot nobody needs today.
The demo's Supabase project is being held on the same reasoning.

## Risks / Trade-offs

**The paused project may not restore, or may restore empty.** → Restoring is the
first task and everything else waits on it. If it comes back without data, the
move becomes a rebuild from `schema.sql` and `seed.sql`, the change's data
requirements stop applying, and that is a decision for the owner rather than a
fallback to take quietly.

**The shop's service key has to be recovered before anything can read.** → It is
on the `forged-in-filament` Vercel project and in the Supabase dashboard. The
Vercel CLI is not installed here, so expect to read it from the dashboard. Do not
write it into `.env` on a branch whose `.env` is shared with `main`'s work
without noting which shop it names; a local dev server reading the wrong shop's
database has already happened once on this repo.

**PostgREST's page size silently truncates a read.** → Range explicitly and
compare counts. This is the specific failure the count check exists to catch.

**Ids and timestamps written explicitly can collide with defaults.** → Insert
with the columns named rather than relying on generated values, and run each
table in a transaction so a collision rolls the table back rather than leaving
half of it.

**`create_order` has to exist on Neon before an order can be placed.** → It comes
from `schema.sql`, which is applied before any row is copied. The demo proved
the function stands up on plain Postgres, including its `security definer`
marking.

**The cold start is new behavior for this shop.** → About two seconds on the
first request after five idle minutes, measured on the demo. A shop with few
visitors pays it often. It is still better than the current failure, which is a
project that pauses out of DNS entirely.

**Row-level security does not come with the move.** → The Neon path runs without
it, for the reasons in `supabase/rls.sql`'s header: the policies defend
PostgREST, and this app ships no publishable key and no browser-side database
client. The exposure that replaces it is shipping the connection string to the
browser, which nothing catches. Recorded in the spec rather than left to be
found.

## Migration Plan

1. Restore `wfhhkdmgouyxnrxnbaeo` from the Supabase dashboard and confirm its
   hostname resolves again. Everything else waits on this.
2. Cherry-pick `6f19869` onto `fif`, resolve the `supabase/schema.sql` and
   `supabase/rls.sql` conflict in `main`'s favour, and confirm `npm run check` is
   green and `git diff` touches nothing the pick did not.
3. Create the shop's own Neon project, apply `supabase/schema.sql` to it with
   `scripts/apply-sql.mjs`, and do not seed it.
4. Copy the rows, then compare counts and digests per table.
5. Point local `.env` at the shop on Neon and run `npm run test:db` and
   `npm run test:e2e` against it, then against Supabase, and confirm they agree.
6. Set the two variables on the `forged-in-filament` Vercel project's Production
   and Preview and redeploy.
7. Verify live: `SMOKE_SHOP=fif npm run test:smoke` at 6 of 6, the catalogue
   returning Neon's row ids rather than Supabase's, and a real order placed,
   found on Neon, absent from Supabase, its staff email received, then deleted.

**Rollback**: set `NUXT_DATABASE_BACKEND` back to `supabase` on Production and
redeploy. The Supabase project still holds the schema and every row as of step 4,
so anything recorded on Neon after the cutover is lost, which is the known cost
of rolling back rather than a defect.

## Open Questions

- Whether to release the Supabase project once the shop has settled, and when.
  It does not change the specs, the approach or the tasks, and the answer is the
  owner's.
- Whether this shop's Neon project belongs in the same Neon organisation as the
  demo's. Either works on the free plan's hundred-project allowance; nothing
  downstream depends on the choice.
