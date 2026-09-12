# What the work turned up

## `nuxt typecheck` never looked at the tests

The whole point of `enforce-typescript` was that nothing checked the repo. It
turns out the check it added still did not: Nuxt's four generated projects cover
`app/`, `server/` and `shared/`, and nothing else. A deliberate
`const x: number = 'text'` in `tests/unit/search.test.ts` passed the entire run.
That is also why the assistant tests' `as any` casts had never been questioned.

`tsconfig.tests.json` now covers the suites and the root config files, and
`npm run typecheck` runs both projects. It found **43 errors** in the suites on
its first run: 30 "possibly undefined" from array indexing, plus a genuine
`.slug` read on a row type that did not carry one. All fixed; a single `!` on
the three fixture exports in `catalogue-stub.ts` accounted for 25 of them.

The same file is what let ESLint's project service parse the repo at all.

## Deriving the tool types was worse than declaring them

`ToolResult` started as `Awaited<ReturnType<typeof runTool>>` with each branch
pulled out by `Extract`, on the reasoning that a derived type cannot drift.
It drifts in the worse direction: renaming `subtotal` to `total` inside the
switch made `Extract<..., { subtotal: string }>` match nothing, so the branch
type became `never`, every test reading it still compiled, and the check that
was meant to catch the rename hid it. Verified, then rewritten as declared
interfaces with `runTool` annotated. The same rename now fails at the return
statement that made it.

## The shared route shapes caught one immediately

Moving the API shapes to `shared/types/api.ts` and annotating each route's
return type turned up a real mismatch on the first run: the quick search panel's
`useFetch` default returned `{ items: [], total: 0 }`, which is not a whole
`CataloguePage`. Its own local copy of the type had no page fields, so nothing
had ever said so.

## An `any` had survived the last change

`enforce-typescript` reported no `any` left in `app/` or `server/`. Its grep was
for `: any`, which does not match `Record<string, any>` - the parameter type of
`present()` in `server/utils/assistant.ts`. It is now a declared `CatalogueRow`,
and that interface becomes a generated row type when the `Database` type lands.

## Timings, and why the lint is not in `npm test`

    typecheck (both projects)   17.7s
    lint                        17.5s
    unit tests                   2.5s
    npm test (typecheck+units)  20.2s
    npm run check (everything)  36.4s

The design said the lint moves out of `npm test` if the run passes roughly 30
seconds. It did, at 36. `npm test` therefore keeps the typecheck and the tests;
`npm run check` is the full pass, and `npm run lint` runs it alone.

## The 23 warnings that are one problem

Every remaining lint finding is `no-unsafe-*` in server code, and every one of
them traces to `useSupabase()` returning a bare `SupabaseClient`: a row from it
is `any`, so every assignment from one is "unsafe". They are set to `warn`
rather than silenced per file, and they should go quiet on their own when the
generated `Database` type lands, at which point they go back to `error`.

## Blocked, then unblocked: generating the database types

`supabase gen types` reads from a live database or a local Docker one:
`--local`, `--linked`, `--project-id` or `--db-url`. There is no schema-file
input. The project ref is known but a personal access token is not in `.env`,
and neither is the database password, so the generation cannot run here. The
choice - a token, or hand-writing the `Database` type from `supabase/schema.sql`
- is the user's, and groups 6 and 7 are stopped until it is made.

A read-only token scoped to the project was supplied and went into `.env` and
`.env.example`. `npm run db:types` runs `scripts/db-types.mjs`, which reads the
token out of `.env` (npm does not load it) and writes
`server/types/database.ts`. Two runs produce the same SHA-256. A dev server
started with the variable removed from the env file served `/` and
`/api/products` at 200, so nothing at run time wants it.

## The typed client cost five errors, and three were one cause

The token arrived, `npm run db:types` generated 399 lines covering seven tables
and `create_order`, and `useSupabase()` became `SupabaseClient<Database>`. The
first typecheck after that found five errors, listed in full in
`typed-client-errors.md`. One was a real bug: `/api/products/[slug]` passed
`getRouterParam(event, 'slug')`, a `string | undefined`, straight into
`.eq('slug', slug)`. Three were the same gap, `products.kind` arriving as
`string` because the column is text with a check constraint rather than an
enum. The fifth was the promo argument to `create_order`, where the generated
`Args` writes a defaulted argument as optional and never as nullable, so an
explicit `null` no longer type-checks; the call now omits the key.

`server/utils/rows.ts` is the new piece. It reads `kind` and the three file
columns back into the shapes the rest of the code uses, by checking the values
rather than casting them, at the one point a row leaves a query. If the column
ever becomes a Postgres enum the generated types carry the union themselves and
that file goes away.

## The 23 warnings went quiet, and two strangers turned up

The `no-unsafe-*` rules are back to `error` and `npm run lint` is 0 and 0. All
23 findings disappeared on their own when the client took the generic, which is
what the last note predicted.

Two errors surfaced that had nothing to do with Supabase. The generated
`server/types/database.ts` trips `no-redundant-type-constituents` twice, so it
is in the lint's ignore list: the typecheck is the check that matters for a file
nobody edits by hand. And `app/stores/color-mode.ts` was assigning an
error-typed value, because `pinia-plugin-persistedstate` ships
`dist/nuxt/runtime/storages.d.ts` importing `../types.js` from a package that
only has `types.d.mts`. `StorageLike` therefore resolves to nothing and
`piniaPluginPersistedstate.localStorage()` has no usable type. The store now
makes those two `window.localStorage` calls itself, which is the whole of what
that helper does.

## Group 4 and group 5, measured 2026-09-12 after archiving

Both were left open as optional follow-ups and both are now done. Recorded here
rather than reopening the change.

### 4.1 and 4.2, `noUncheckedIndexedAccess`

**It costs nothing, so it is on.** Turned on in `nuxt.config.ts` under
`typescript.tsConfig`, which is what puts it into all four generated projects,
and in `tsconfig.tests.json`, which Nuxt does not generate. The full typecheck
then reported **zero errors** across app, server, shared and the test suites.

Zero is a suspicious number for this flag, so it was proved rather than
trusted. A throwaway `server/utils/_nuci-probe.ts` reading `xs[0].length` off a
`string[]` produced `TS18048: 'first' is possibly 'undefined'` in all three
projects, and was deleted. The flag bites; this code simply does not index into
arrays or records without checking first.

`npm run check` (typecheck, lint, 236 tests) and `npm run build` both pass with
it on.

### 5.1, the provider run

`npm run test:llm` is 8/8 against a real `gpt-5-mini` through a running dev
server, 49 seconds. That is 8 provider calls, 9 with `test:e2e:llm`, against
the ceiling of ten the user set. The typed chat loop still completes real tool
rounds, which is the one thing the typecheck and the build could not tell us.
