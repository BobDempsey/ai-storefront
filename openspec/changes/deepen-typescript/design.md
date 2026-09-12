## Context

See proposal.md for motivation. What shapes the approach:

- `server/utils/supabase.ts` memoizes one service-role client, typed
  `SupabaseClient` with no generic. Fifteen `.select(...)` calls read through it,
  plus `create_order`, an RPC whose arguments and return are equally unchecked.
- There is no Supabase CLI in the repo and no `supabase/config.toml`; the schema
  lives as plain SQL. `AGENTS.md` forbids agents from touching Supabase storage
  and the MCP server is scoped to database and docs tools.
- Route responses are hand-declared where they are read: `app/types/index.ts`
  holds `Product`, `CartPreview`, `OrderResponse` and friends, and
  `CataloguePage` was declared twice during the pagination work, once in
  `index.vue` and once in `SearchPalette.vue`.
- `npm test` is `nuxt typecheck && vitest run`, 13 seconds and 3.
- The tests' casts are concentrated: two assistant files, about twenty `as any`.

## Goals / Non-Goals

**Goals:**

- A column rename fails the typecheck rather than the shop.
- One declaration per route shape, imported by both sides.
- Lint and typecheck both runnable alone and both part of `npm test`.

**Non-Goals:**

- CI, TypeScript 7, formatting, runtime response validation. See the proposal.

## Decisions

**The Supabase work goes last, not first.** It is the item most likely to stop:
generating types may need an access token that has to be agreed before anything
is written, and typing the client will surface a pile of existing query errors
that need reading and scoping before they are fixed. Everything else here is
self-contained and finishes on its own, so putting the shared route shapes, the
tests' casts, the linter, the flag measurement and the provider run ahead of it
means a blocked database step leaves five finished pieces behind rather than a
half-done change. The reverse order would have the token question blocking work
that never needed it.

**Generate the database types with `supabase gen types`, committed to the repo.**
The alternative is hand-writing a `Database` interface, which is wrong the first
time the schema changes and has no way to tell you. Committing the output rather
than generating at build time keeps `npm install` offline and means the diff
shows up in review when a column moves, which is the point.

**Generate from the local `schema.sql`, not from the live project, if the CLI
allows it.** Generating from the live database couples a typecheck to a network
call and a credential, and the two shops will eventually have two databases with
one schema. The first task settles which form works here; if only the
`--project-id` form is available, the script takes it and the tasks record that
the token is needed, since that is a new environment variable and the proposal
says so.

**The client becomes `SupabaseClient<Database>` in one place.** Every caller
already goes through `useSupabase()`, so the generic is added once and every
query is checked from then on. Expect this to surface real errors in existing
queries; they are findings, not regressions, and the tasks say to read them
before fixing them.

**One response type per route, declared beside the route and re-exported for the
browser.** The pagination work declared `CataloguePage` twice within the same
change, which is the drift this prevents. `app/types/index.ts` stays the browser's
import point so app code keeps one import path, and it re-exports what the server
declares rather than restating it.

**ESLint flat config with `typescript-eslint` and the Nuxt/Vue plugin,
type-aware rules on.** Without type information the linter cannot see a floating
promise, which in a shop that sends email and writes orders is exactly the bug
worth catching. Type-aware linting is slower; the tasks measure it, and if it
pushes `npm test` past roughly 30 seconds the lint moves to its own script and
`npm test` keeps the typecheck alone.

**`noUncheckedIndexedAccess` is a measurement, not a goal.** Turn it on, count
the errors, look at what they are. If they are mostly real (an array index
assumed present, a `Record` lookup assumed populated) it stays on and the errors
get fixed. If they are mostly noise in tests, it stays off and the number is
recorded so nobody re-litigates it from memory.

## Risks / Trade-offs

- **The typed client surfaces a pile of existing errors** → likely, and the
  point. The tasks read the list first and agree scope before fixing, the same
  way `enforce-typescript` handled its twelve.
- **`npm test` keeps growing** → measured at each step; the fallback is stated
  above, and `test:unit` remains the fast loop either way.
- **Generated types go stale** → they are committed, so a schema change with no
  regeneration shows as types that disagree with the SQL in the same diff. The
  README gains the command; nothing enforces it until there is CI.
- **ESLint and the existing code disagree loudly on day one** → the config
  starts at the recommended sets rather than everything, and any rule turned off
  is turned off with a comment saying why.

## Migration Plan

No runtime change and no data change. Anyone pulling this runs `npm install
--legacy-peer-deps` for the lint dependencies. If type generation needs a
Supabase token, it is needed only to re-run the generation, never to build or to
run the app, and `.env.example` says so. Rolling back is reverting the commit.
