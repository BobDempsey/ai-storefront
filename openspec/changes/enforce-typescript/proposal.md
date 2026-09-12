## Why

Every file in this repo is TypeScript, and nothing checks any of it. There is no
`vue-tsc`, no `typecheck` script and no linter, and `nuxt build` does not
typecheck: it transpiles and moves on. The only type safety today is whatever
the author's editor happened to show while they were writing, which is why six
`any` escapes sit in app and server code with nothing to flag them.

That is a gap in the same class as having no tests, and it has the same fix:
make the check runnable by one command, make it fail loudly, and run it with
everything else. A template other people adopt should hand them that check
rather than the habit of not having it.

## What Changes

- `vue-tsc` and `typescript` are added as dev dependencies, with an `npm run
  typecheck` script that checks the app, the server routes, the Vue components
  and the tests in one pass.
- Type checking becomes part of the routine run rather than a thing to remember:
  `npm test` runs it alongside the unit tests, so a type error fails like a
  failing test does.
- The six `any` escapes are replaced with real types: the four `catch (error:
  any)` handlers in the components and pages, the one in the assistant store,
  and the `any[]` message array in `server/api/chat.post.ts`.
- A shared type for the error shape those handlers actually read, so an H3 error
  is narrowed once rather than cast five times.
- The assistant's provider messages take the SDK's own message type, so a
  malformed tool round is a type error rather than a runtime surprise.
- `README.md` and `AGENTS.md` state that the typecheck is part of the run.

## Non-goals

- **ESLint, Prettier or any style tooling.** Formatting is a separate argument
  with separate trade-offs; this change is about types only.
- **`any` in the test suite.** The `as any` casts in the assistant tests are
  legal TypeScript and pass a typecheck as written. Tightening them is worth
  doing and is not this change.
- **Stricter compiler flags than Nuxt's own.** Nuxt's generated config is
  already `strict`; turning on `noUncheckedIndexedAccess` or similar is a
  separate decision with a real migration cost.
- **Generated database types from Supabase.** Worth doing, needs the CLI and a
  generation step in the workflow, and is its own change.
- **A CI pipeline.** There is no CI in this repo yet; this change makes the
  check runnable and part of `npm test`, which is where CI would call it from.

## Capabilities

### New Capabilities

None. Type checking is a development-time guarantee about the codebase, not
behaviour a visitor to the storefront can observe.

### Modified Capabilities

None. No requirement changes: the shop behaves exactly as it does today, and
this change is `skip_specs: true`.

## Impact

- `package.json` — two dev dependencies and the `typecheck` script, with `test`
  running it first.
- `app/components/AssistantDrawer.vue`, `app/components/EmailOptinForm.vue`,
  `app/pages/checkout.vue`, `app/pages/contact.vue`, `app/stores/assistant.ts` —
  typed catch handlers.
- `server/api/chat.post.ts` — a typed message array.
- `app/types/index.ts` or a new `app/utils/errors.ts` — the shared error shape.
- `README.md`, `AGENTS.md` — the check is part of the run.

**No Supabase schema or RLS change**, no new environment variable, and no change
to anything the storefront serves.
