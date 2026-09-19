# Proposal

## Why

Forged in Filament is down. Its Supabase project `wfhhkdmgouyxnrxnbaeo` is
paused, `wfhhkdmgouyxnrxnbaeo.supabase.co` no longer resolves, and
`fif.bobdempsey83.com` serves its shell and 502s the catalogue. A paused
free-plan project loses its DNS this way, and it will pause again the next time
the shop goes quiet, because that is what the free plan does to a project nobody
visits.

The demo proved the way out on `main`. `NUXT_DATABASE_BACKEND` names which
Postgres a deployment reads, the shim behind it speaks the same query builder
every call site already uses, and the demo has run on Neon since 2026-09-18 with
its database tests, its end-to-end suite and a real order all passing. Neon does
not pause a project out of existence; it scales to zero and wakes on the next
request, at a cost measured on the demo at about two seconds.

This shop has one thing the demo did not: records worth keeping. Its orders,
redemptions and subscribers are the only copy, so this move migrates rows rather
than rebuilding from seed.

## What Changes

- The backend switch arrives on `fif` by cherry-picking `6f19869` from `main`
  rather than being written again. `fif` receives template fixes this way and
  never merges back, so the shim, the startup plugin, `supabase/rls.sql` and the
  Neon path through `scripts/db-types.mjs` all come across as one commit.
- A Neon project is created for this shop, separate from the demo's
  `solitary-surf-65980038`. Two shops, two databases, which is the rule that
  already holds and does not relax because both sit on one provider.
- **The shop's existing rows are migrated, not reseeded.** Orders, order items,
  promo redemptions and email subscribers are copied across with their ids and
  timestamps intact. The demo's change explicitly declined this because its data
  was seed plus test orders; here the order history is the record of what the
  shop has actually done.
- The `forged-in-filament` Vercel project gains `NUXT_DATABASE_BACKEND=neon` and
  a connection string on Production and Preview. It has no backend setting at
  all today, so it takes the `supabase` default.
- The Supabase project stays, restored and untouched, as the rollback. Switching
  back is one variable and a redeploy.
- **Not BREAKING**: no route, response shape or test changes behavior. Every
  difference is configuration.

## Non-goals

- **Deleting the Supabase project.** It is the rollback until this shop has run
  on Neon long enough to trust, and that call is the owner's.
- **Changing the catalogue.** Deciding what this shop actually sells is separate
  work already on `tasks.md`; this change moves whatever rows exist.
- **Building an admin screen.** Staff flip `in_stock` by hand, and Neon's table
  editor replaces Supabase's for that. The owner accepted the swap when the demo
  moved.
- **Removing `@supabase/supabase-js`.** It stays, because it is what the
  rollback runs on.
- **Eliminating the cold start.** Scale-to-zero after five idle minutes cannot be
  disabled on the free plan. Two seconds on a first request is accepted, and it
  is a better failure than a project that pauses until someone notices.
- **Moving anything else off Supabase.** There is no auth, storage or realtime in
  this app to move.

## Capabilities

### New Capabilities

- `platform/database-backend`: which Postgres a deployment reads and writes, how
  that choice is made from configuration, and what the storefront must do
  identically whichever backend is behind it. This capability exists in the
  template's in-flight change and has never reached `fif`; it arrives here with
  the code it describes.
- `platform/database-migration`: what must survive when a shop's database moves
  hosts, and what must remain true of the host it left.

### Modified Capabilities

- `storefront/shop-identity`: the requirement that a deployment reads and writes
  exactly one database assumes both shops' databases are the same kind of thing.
  It has to hold when they sit on different providers, and go on holding when
  they sit on the same one.

## Impact

**Supabase schema and RLS.** `supabase/schema.sql` loses its `enable row level
security` lines, its two `select` policies and the revoke naming `anon` and
`authenticated`; they move into `supabase/rls.sql`, applied on Supabase and not
on Neon. This is a real reduction in defence-in-depth for the Neon path and is
recorded rather than glossed over: those policies defend PostgREST, which anyone
can reach with a publishable key, and this app ships no browser-side database
client and no publishable key. Neon exposes no equivalent endpoint. What is
given up is the closed door a future mistake would otherwise hit.

**The paused project gates everything.** No row can be read out of
`wfhhkdmgouyxnrxnbaeo` until it is restored from the Supabase dashboard, which
is a human action this change cannot perform. Restoring it is the first task and
nothing after it can start.

**Code.** Nothing written here. `server/utils/db/`, `server/plugins/database-backend.ts`,
`server/utils/supabase.ts`, `scripts/db-types.mjs`, `supabase/schema.sql`,
`supabase/rls.sql` and `nuxt.config.ts` all arrive by cherry-pick, and a diff
touching anything else means the pick went wrong.

**Configuration.** Two new variables on the `forged-in-filament` Vercel project's
Production and Preview, and in local `.env` on this branch. `NUXT_SUPABASE_URL`
and `NUXT_SUPABASE_SERVICE_KEY` stay defined, because the rollback needs them.

**Data.** The migration is the risky half. Ids are preserved so a staff member
holding an order id from an email can still find it, and the Supabase copy is
left intact so a bad migration costs a redeploy rather than the history.

**Tests.** `tests/db/` follows `NUXT_DATABASE_BACKEND` and runs unchanged against
each backend, which is how the two are proved to agree. `tests/smoke/` with
`SMOKE_SHOP=fif` is the live proof, and it is 2 of 6 today because the shop is
down.
