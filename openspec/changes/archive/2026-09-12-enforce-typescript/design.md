## Context

See proposal.md for motivation. What shapes the approach:

- `tsconfig.json` is Nuxt 4's project-references form: four generated configs
  under `.nuxt/`, for the app, the server, shared code and node. They exist only
  after `nuxt prepare`, which `postinstall` already runs.
- Nuxt's generated configs are `strict` already, so this is about running a
  checker, not about tightening flags.
- `npm test` is `vitest run`: 225 unit tests, no network, about a second. It is
  the command run on every save, so whatever is added to it has to stay fast.
- The six `any` escapes are two shapes. Five are `catch (error: any)` reading
  `statusMessage` and, in one case, `error.data.data.promoStatus` off an H3
  error. The sixth is `messages: any[]` in the assistant's tool loop.
- `openai@7` ships its own message types, and the loop pushes assistant messages
  and tool results back into that array.

## Goals / Non-Goals

**Goals:**

- One command that checks everything, and a failing type is as loud as a
  failing test.
- No `any` left in `app/` or `server/`.
- No change to what the storefront serves.

**Non-Goals:**

- Linting, formatting, stricter-than-Nuxt flags, generated Supabase types, CI.
  Each is its own change; see the proposal.

## Decisions

**`vue-tsc`, not `tsc`.** The `any`s are in `.vue` files as much as in `.ts`
ones, and plain `tsc` cannot read a single-file component. `vue-tsc` is the
checker `nuxt typecheck` itself asks for, so using it keeps one answer rather
than two.

**Run it through `nuxt typecheck` rather than calling `vue-tsc` directly.** The
Nuxt command resolves the four generated project references and the `.nuxt`
types for auto-imports; a direct `vue-tsc --noEmit` would have to be told about
all of it and would drift the next time Nuxt changes its config layout. The
script is therefore `nuxt typecheck`, and the dependency is what makes it work.

**`npm test` runs the typecheck first, then Vitest.** A type error should stop
the run before a hundred green assertions scroll past it. The cost is a few
seconds on a command that currently takes one, which is the trade being made
deliberately: the check is worthless if it is the thing people forget. `npm run
test:unit` stays available for the fast inner loop.

**One shared helper for the H3 error shape, not five casts.** The five handlers
all ask the same two questions of a caught value: does it carry a
`statusMessage`, and does it carry the promo data the checkout reads. A small
`isFetchError`-style narrowing in `app/utils/errors.ts` answers both, typed
against what `$fetch` actually throws, and the handlers become `catch (error:
unknown)`. `unknown` rather than a named type is the point: a caught value is
genuinely unknown, and the narrowing is where the knowledge is added.

**The provider messages take the SDK's own type.** `OpenAI.Chat.Completions`
exports the union the API accepts, and the loop pushes into it. Declaring
`messages` as that union means a malformed tool result fails at the type level
rather than as a 400 from the provider, which is the round trip this change is
worth.

**Nothing in `tests/` changes.** Their `as any` casts compile. Tightening them
is real work with no failing check behind it, and mixing it in would hide the
production-code change inside a much larger diff.

## Risks / Trade-offs

- **`npm test` gets slower** → measured before and after in the tasks; if the
  typecheck turns out to cost more than a few seconds, the fallback is running
  it in `test:all` and leaving `npm test` alone, and the tasks say so.
- **`vue-tsc` reports pre-existing errors nobody has seen** → that is the point,
  and the first task is to run it and read the list before changing anything, so
  the size of the problem is known before the fix is designed around it.
- **A typed message union is stricter than the loop currently is** → if the SDK
  union turns out to reject something the loop legitimately does, the narrower
  fix is typing the array as the SDK's message type and casting once at the
  push, with a comment saying why. Not silently returning to `any[]`.
- **`postinstall` must have run** → `nuxt typecheck` needs `.nuxt`; the script
  already runs `nuxt prepare` on install, and a fresh clone that skips it gets a
  clear error rather than a wrong answer.

## Migration Plan

No runtime change, no environment variable, no data. Anyone who pulls this runs
`npm install --legacy-peer-deps` to get the two dev dependencies; without them
`npm test` fails on the typecheck with the message naming what to install.
Rolling back is reverting the commit.
