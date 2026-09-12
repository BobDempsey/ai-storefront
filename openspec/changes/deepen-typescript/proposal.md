## Why

`enforce-typescript` made the repo check itself: `npm test` runs `vue-tsc`, and
no `any` is left in `app/` or `server/`. What it did not do is make the check
worth much at the two boundaries where a mistake actually costs something.

The database is unchecked. `useSupabase()` returns a bare `SupabaseClient`, so
the fifteen `.from(...).select(...)` calls in `server/` are validated against
nothing: rename a column in `supabase/schema.sql` and the typecheck passes, the
build passes, and a visitor finds out. The HTTP boundary is no better. Each
route's response shape is repeated by hand wherever the browser reads it, which
is how `/api/products` could change from an array to `{ items, total }` and be
caught by tests rather than by types.

The rest is the list that came out of that change: the tests' own `as any`
casts, no linter at all, one compiler flag worth trying, and a provider run that
has not happened since the chat loop was typed.

## What Changes

- **Generated Supabase types.** A `Database` type generated from the schema,
  passed to `createClient<Database>`, so a renamed or dropped column is a type
  error in every query that reads it. The generation is a script anyone can
  re-run, not a one-off paste.
- **One shape per route, shared.** Each API route's response type is declared
  once and read by both the route and the browser code that fetches it, so the
  two cannot drift.
- **The tests stop casting.** The `as any` casts in
  `tests/unit/assistant-read-tools.test.ts` and `assistant-write-tools.test.ts`
  are replaced with the tools' real result types, which is also the first time
  those types get stated anywhere.
- **ESLint with the TypeScript rules**, on `npm run lint` and in `npm test`
  after the typecheck. The checker catches wrong shapes; it says nothing about
  an unused import, a floating promise or a `console.log` left behind.
- **`noUncheckedIndexedAccess` is tried, measured and then decided**, rather
  than turned on and hoped for. If the cost is small it stays on; if it is not,
  the decision and the number behind it are recorded and it stays off.
- **`npm run test:llm` is run once**, confirming the typed chat loop still
  completes a real tool round against the provider.

## Non-goals

- **CI.** There is no CI in this repo, and standing one up is its own decision
  about where it runs and what it costs. Everything here is runnable by one
  command locally, which is what a CI would call.
- **TypeScript 7.** Pinned at `^5.9.0` because `vue-tsc@3` cannot resolve
  `lib/tsc` under 7. Revisit when vue-tsc supports it; nothing here depends on
  the version.
- **Prettier or any formatter.** ESLint here is for correctness rules, not
  whitespace. Adding a formatter is a separate argument.
- **Runtime validation of API responses.** Types are compile-time; a route
  returning something else at runtime is a different problem, and Zod already
  guards the inputs.
- **Changing any behaviour the storefront exposes.** Nothing a visitor can see
  should differ by a pixel.

## Capabilities

### New Capabilities

None. This is a development-time guarantee about the codebase, not behaviour a
visitor can observe.

### Modified Capabilities

None: `skip_specs: true`, the same reasoning as `enforce-typescript`.

## Impact

- `package.json` — a `db:types` script, a `lint` script, ESLint dev
  dependencies, and `npm test` gaining the lint step.
- `server/utils/supabase.ts`, `server/types/database.ts` (generated) — the typed
  client.
- `server/api/*.ts` and `app/types/index.ts` — one declared shape per route.
- `tests/unit/assistant-*.test.ts` — real types instead of casts.
- `eslint.config.mjs` — new.
- `README.md`, `AGENTS.md` — the lint step and how to regenerate the types.

**No Supabase schema or RLS change**: the types are generated *from* the
existing schema and nothing about the database is altered. No new environment
variable, unless generating types needs a Supabase access token, which the tasks
settle before anything else is built.
