# Proposal

## Why

The Supabase free plan caps how many projects can be active at once, and this
repo runs two: `qtzwrwstixqgnuixfajp` for the demo and `wfhhkdmgouyxnrxnbaeo`
for Forged in Filament. Moving the demo to Neon's free plan frees the slot the
owner wants back.

The demo uses none of Supabase's own services. It has no auth, no storage, no
realtime and no PostgREST access from the browser; every query runs server-side
through a service-role client that bypasses RLS anyway. What it actually needs
is Postgres, which Neon provides on a free plan that allows 100 projects rather
than two.

## What Changes

- A new database layer picks its backend from configuration at startup, so one
  build can run against Supabase or against plain Postgres without a code
  change. Both shops keep running the same code whichever database they point
  at.
- `server/utils/supabase.ts` is replaced by a shim exposing the same query
  builder the 15 existing call sites already use. No route, no utility and no
  test changes the way it asks for data.
- `supabase/schema.sql` gains a plain-Postgres path: `create_order` and the
  tables it writes have to exist on Neon, and the parts that only mean something
  inside Supabase are marked as such.
- The demo's Vercel project points at Neon. Forged in Filament is not touched by
  this change and stays on Supabase, which is the case that proves the backend
  is configuration rather than code.
- `scripts/db-types.mjs` learns to generate `server/types/database.ts` from a
  Neon connection as well as from a Supabase project ref.
- **Not BREAKING**: every existing call site, response shape and test keeps its
  current behavior. Pointing the configuration back at Supabase restores the
  present arrangement.

## Non-goals

- **Moving Forged in Filament.** Its code is already identical to the demo's and
  it can move later. This change deliberately proves the path on the shop that
  sells nothing before touching the one that does not.
- **Keeping the Supabase dashboard's table editor.** Staff flip `in_stock` by
  hand there. Neon's console has its own table editor and the owner has accepted
  the swap; building an admin UI is not in scope here.
- **Removing `@supabase/supabase-js`.** The dependency stays so the Supabase
  backend keeps working. Removing it would make the swap back a rewrite.
- **Changing what any route returns.** This is a move of where the rows live,
  not of what the app does with them.
- **Eliminating Neon's cold start.** Scale-to-zero after five minutes idle cannot
  be disabled on the free plan. A demo with no visitors will pay it, and that is
  accepted rather than worked around.
- **Migrating the demo's existing rows.** The demo's data is seed data plus test
  orders; `schema.sql` and `seed.sql` rebuild it.

## Capabilities

### New Capabilities

- `platform/database-backend`: which Postgres a deployment reads and writes, how
  it is chosen from configuration, and what must stay true of the storefront
  whichever backend is chosen.

### Modified Capabilities

- `storefront/shop-identity`: the requirement that a deployment reads and writes
  exactly one database currently assumes every shop's database is the same kind
  of thing. It has to also hold when two shops sit on different providers.

## Impact

**Supabase schema and RLS.** `supabase/schema.sql` is the file this change
touches most. Its tables, the `create_order` function and its `security definer`
marking all have to stand up on Neon. Its RLS policies do not carry over in any
meaningful sense: on Supabase they guard PostgREST, which anyone can reach with
a publishable key, and this app has never shipped one. Neon exposes no such
endpoint, so there is nothing for a policy to defend. The policies stay in the
Supabase path and the Neon path omits them, which is a real reduction in
defence-in-depth and is recorded here rather than glossed over.

**Code.** `server/utils/supabase.ts` (replaced), `server/types/database.ts`
(regenerated), `scripts/db-types.mjs`, and `nuxt.config.ts` for the new runtime
config. The 15 call sites across `server/api/` and `server/utils/` are expected
to be untouched, and that expectation is the change's main acceptance test.

**Dependencies.** Adds a Postgres driver. `@supabase/supabase-js` stays.

**Configuration.** A new connection setting on the demo's Vercel Production and
Preview, and in local `.env`. `NUXT_SUPABASE_URL` and `NUXT_SUPABASE_SERVICE_KEY`
stay defined for the shops still using them.

**Tests.** `tests/db/` runs against a live database and will run against Neon
for the demo. `tests/unit/` needs no network and should be unaffected;
`tests/smoke/` checks the deployed site and is the end-to-end proof.
