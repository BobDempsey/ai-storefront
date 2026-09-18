# Design

## Context

See proposal.md for why. What shapes the approach is what the 15 call sites
actually ask for, which is narrower than `supabase-js` but wider than plain SQL:

- Thirteen query methods in total: `from`, `select`, `eq`, `in`, `or`, `order`,
  `range`, `limit`, `single`, `maybeSingle`, `insert`, `upsert`, `delete`, plus
  one `rpc`.
- `select('id', { count: 'exact', head: true })` in `countMatching`, which is a
  `COUNT(*)` with no rows returned, and `{ count: 'exact' }` alongside a ranged
  read, which is a count and a page in one round trip.
- `upsert({ email }, { onConflict: 'email', ignoreDuplicates: true })` in
  `subscribe.ts`, which is `ON CONFLICT DO NOTHING`.
- Every call unwraps `{ data, error }` rather than catching a thrown error, and
  `orders.post.ts` reads `error.message` for the strings `create_order` raises:
  `unavailable_item`, `empty_order`, `invalid_item` and the promo-code codes.

Two of those are not generic Postgres at all, and they are the reason this
design exists rather than being obvious:

- **`.or(searchFilter(term))` takes PostgREST filter syntax**, the string
  `name.ilike.*term*,description.ilike.*term*`, built in
  `server/utils/search.ts`. Nothing in Postgres parses that.
- **`products.get.ts` branches on `error.code === 'PGRST103'`**, PostgREST's
  code for a range starting past the end of the result, and turns it into an
  empty page rather than a 502. A stale link to page nine reaches the visitor as
  an empty catalogue because of that branch.

The service-role client is the only client. There is no browser-side Supabase
client, no publishable key and no auth, which is why RLS can be dropped on the
Neon side without changing what any caller can reach.

## Goals / Non-Goals

**Goals:**

- One backend interface both Supabase and Neon implement, chosen at startup from
  configuration.
- Zero edits to the 15 call sites. That is the acceptance test for the shim: if
  a route has to change, the shim is wrong.
- `create_order` stays one Postgres function on both backends, so the ordering
  transaction and its rounding are the same code rather than the same intent.

**Non-Goals:**

- A general `supabase-js` reimplementation. The shim covers what this repo calls
  and throws on anything else rather than silently doing something plausible.
- A query builder anyone would use directly. New code should reach for SQL
  through the backend interface; the shim exists to avoid rewriting 15 call
  sites today, not to be the pattern for the sixteenth.

## Decisions

### Keep the `supabase-js` surface rather than rewrite the call sites

A rewrite to raw SQL touches every route, every one of the 44 `tests/db/` tests
and the assistant's tool handlers, and it does it in the same change that moves
the data to a new host. Two variables, one failure to explain. The shim keeps
the diff to one file plus schema, so a failure after the switch is a database
problem rather than a "which of the forty edits broke it" problem.

The cost is a hand-written query builder that has to be right. It is bounded:
thirteen methods over six tables, with a type signature the compiler checks
against `Database` because the call sites are already typed.

Alternative considered: rewrite to SQL now. Better code at the end, worse odds
of a clean cutover. Worth doing later as its own change, when the backend
interface has proven itself and the rewrite is not also a migration.

### `@neondatabase/serverless` over HTTP, not `pg` over TCP

The demo runs on Vercel functions, which are short-lived and numerous. A pooled
TCP client per instance is the classic way to exhaust a Postgres connection
limit. Neon's driver speaks HTTP for single statements, so a function that runs
one query opens no connection to leak.

Every query this app makes is a single statement, `create_order` included: it is
one `select` on a function that does its own transaction internally. So the
HTTP path's inability to hold an interactive multi-statement transaction across
round trips costs nothing here.

Alternative considered: `pg` with Neon's pooled endpoint. Fewer surprises, one
more thing to tune, and no benefit until something needs an interactive
transaction.

### Emulate `PGRST103` rather than change `products.get.ts`

The past-the-end branch is real behavior with a scenario behind it. The shim
computes the same condition (a requested range starting at or past the total)
and returns an error object carrying `code: 'PGRST103'`, so the call site's
branch fires unchanged on either backend.

This is the ugliest decision here: it bakes a PostgREST error code into a module
that will outlive PostgREST in this repo. It is written down rather than hidden,
and the cleanup is a one-line call-site change once both shops are off Supabase.

Alternative considered: change the call site to check the page against the count
itself. Cleaner, and it breaks the zero-call-site-change property that makes the
cutover auditable. Do it after, not during.

### Translate PostgREST filter strings rather than change `searchFilter`

`searchFilter` is shared by the catalogue route and the assistant's tool, and its
docstring says the two must never answer differently. The shim parses the
`col.ilike.*pattern*` form it produces into `col ILIKE $n` with `%` wildcards,
which is what PostgREST does with it anyway.

The parser accepts only `ilike` and only the comma-separated `or` shape this repo
produces, and throws on anything else. A filter the shim cannot parse must fail
loudly: a search that quietly matches everything is worse than a search that
errors, because nobody reports it.

`escapeLikePattern` already escapes `%` and `_` and strips commas and
parentheses, so the parser does not have to handle a comma inside a pattern.

### Split the schema rather than fork it

`supabase/schema.sql` stays the one file that defines tables, constraints,
indexes and `create_order`. The statements that only mean something on Supabase,
the `enable row level security` lines and the policies, move into
`supabase/rls.sql`, applied on Supabase and not on Neon.

One schema file, two ways to finish it. A fork would drift, and the first
symptom of drift is an order that prices differently on one shop.

`create_order` keeps its `security definer` marking. On Neon with a single
application role it grants nothing extra, and removing it would be a difference
between the two backends for no gain.

### Generate types from whichever backend, and check them against each other

`scripts/db-types.mjs` uses the Supabase CLI, which needs a project ref. Neon has
no equivalent, so the script gains a second path that introspects a Postgres
connection directly and emits the same `Database` shape.

Until then, and because Forged in Filament is still on Supabase, the committed
`server/types/database.ts` can keep being generated from a Supabase project
holding the same schema. That is a real dependency on Supabase outliving this
change, and it is why the schema comparison, an md5 over every column's name,
type and nullability, is a task here rather than a nicety. It is the same check
that compared the two Supabase projects on 2026-09-12.

### The backend is named, not sniffed

Configuration names the backend rather than the code guessing from the shape of
a connection string. A deployment that names nothing fails at startup. Guessing
is how a shop ends up on the wrong database with nothing in the logs saying so.

## Risks / Trade-offs

**The shim is subtly wrong in a case no test covers** → The 44 `tests/db/` tests
run against a live database and are the main defence: run the whole suite
against Neon and against Supabase and require the same results. The shim throws
on any method or filter form it does not implement, so an unsupported case is an
error rather than a wrong answer.

**Cold start on the free plan** → Neon suspends after five minutes idle and it
cannot be disabled. A demo with no visitors pays it on the first request.
Accepted. Measure it after the cutover and record the number, so the next
person deciding about the plan has a figure rather than a worry.

**Rounding drifts between backends** → `create_order` is the same SQL on both,
so this can only break if the two schemas drift. The md5 column comparison is
the check, and it runs before the cutover rather than after.

**`error.message` matching breaks on a different driver** → `orders.post.ts`
matches substrings of what `create_order` raises. Both drivers surface a raised
exception's message, but the surrounding text differs. The shim normalises the
error into `{ message, code }` with the raised message intact, and
`tests/db/create-order.test.ts` already exercises every one of those codes.

**The demo's Supabase project is deleted before Neon is proven** → Do not delete
it in this change. Free the slot only after the demo has run on Neon through a
full `test:db` and `test:smoke` pass, and after the owner says so.

**`storefront/shop-identity` now spans two providers** → The requirement that a
shop never reads another shop's data gets harder to check by eye when the two
databases are not even the same kind. The smoke test already names a shop and
asserts it reports its own name; keep that as the check.

## Migration Plan

1. Build the backend interface, the Neon implementation and the Supabase one,
   with the Supabase path still selected. Nothing changes yet, and the unit
   tests plus `test:db` against the current Supabase project prove the shim is
   faithful before any data moves.
2. Split `rls.sql` out of `schema.sql`. Re-apply both on Supabase and confirm the
   project is unchanged.
3. Create the Neon project. Apply `schema.sql` then `seed.sql`. Compare the two
   schemas by md5 over column name, type and nullability.
4. Point local `.env` at Neon and run `test:db` and `test:e2e`. Fix the shim
   until both match what they did on Supabase.
5. Switch the demo's Vercel Production and Preview to Neon. Verify with
   `SMOKE_SHOP=demo`, then place a real order on the live demo, find it in Neon,
   and delete it. That is what "verified" has meant for every previous database
   change here.
6. Leave the demo's Supabase project alone. Deleting it is a separate decision
   after the demo has run on Neon for long enough to trust.

**Rollback**: change the demo's backend setting back to Supabase and redeploy.
The Supabase project still holds the schema and its seed data, so rollback is a
variable and a build, not a restore.

## Open Questions

- **How long is the cold start in practice?** It affects nothing in this design;
  it affects whether the owner wants a keep-warm ping later. Measure after step 5.
- **Does Forged in Filament follow?** Deliberately deferred. The owner asked to
  prove the demo first, and this design is the thing that makes that a later
  decision rather than a later rewrite.
