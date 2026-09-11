## Context

See proposal.md for motivation. The constraints that shape the approach:

- **The colour mode is read in two places.** `app/stores/color-mode.ts` owns the
  `.dark` class, and an inline script in `nuxt.config.ts` reads the same
  `color-mode` localStorage key synchronously before first paint. That script
  already treats a missing value and `system` identically, so it needs no edit
  as long as the stored values stay `light`, `dark` and `system`.
- **The assistant store deliberately persists nothing.** Its docblock says so,
  and the "a conversation is not kept" requirement depends on it. Anything this
  change stores has to stay outside that store's persistence, or the guarantee
  becomes a thing a future edit can break by accident.
- **`openDrawer()` already asks whether the assistant is available**, with a
  free GET to `/api/chat` that ships no key and makes no provider call. The
  auto-open needs the same answer before it decides, not after.
- **The drawer and both navbar buttons are inside `ClientOnly`.** The cart
  cookie is sent with every request, so the layout renders server-side, but
  these controls do not. Anything reading browser storage runs after mount.

## Goals / Non-Goals

**Goals:**

- Keep `system` a working stored value while removing it from the navbar, so
  the pre-paint script and existing visitors' stored preferences keep working.
- Record the first-visit flag without weakening the assistant store's
  no-persistence property.
- Make the auto-open decision pure enough to unit test, since it has four
  branches and none of them is exercised by an existing test.

**Non-Goals:**

- No visual redesign of the navbar beyond the two icon changes.
- No change to the drawer's layout, the draft card, or the promo field.
- No new environment variable and no server-side change.

## Decisions

### The toggle reads the effective scheme, not the stored mode

`toggle()` sets the mode to `light` when `isDark` is true and `dark` otherwise.
Deriving from `isDark` rather than from `mode` is what makes the `system` case
correct for free: a visitor on `system` under a dark OS sees the moon, and one
activation moves them to `light`, which is the opposite of what they were
looking at. Branching on `mode` instead would send that visitor to `dark`, which
is the scheme they already had, and the click would appear to do nothing.

`cycle()` goes, because nothing will call it and a three-state cycle with no
third icon is a trap for the next reader. `set()` stays and still accepts all
three modes, so `system` remains reachable in code, in a test, and by any later
change that wants to offer it again. That is the "keep the logic" half of the
request.

**Alternative considered:** keep `cycle()` and skip `system` inside it. Rejected
as the same behavior with a name that lies about it.

### The first-visit flag is its own localStorage key, written by hand

A dedicated `assistant-greeted` key, read and written directly inside a
`try`/`catch`, rather than adding `persist` to the assistant store.

Adding `persist` to that store would mean picking fields to persist forever
after, and the one thing that must never be persisted there is the conversation.
A `pick` list is one careless edit away from storing messages, and the spec
requirement that a reload starts fresh would fail quietly. A separate key cannot
drift into that.

The key goes in localStorage rather than a cookie for the same reason the
colour-mode store opts out of the module default: the server has no use for it,
and a cookie would ride along on every request.

**Alternative considered:** a `sessionStorage` flag, which would reopen the
panel once per session. Rejected as nagging, and it is not what "first visit"
means.

### Unreadable storage means no auto-open

If the read throws, the flag cannot be written either, so an auto-open would
fire again on the next page and every page after it. Treating a storage failure
as "already greeted" fails toward silence. The colour-mode store's
unreadable-storage scenario resolves the same way, toward the quiet default.

### Availability is checked before the panel opens, not after

The auto-open path fetches `/api/chat` first and opens only on `available:
true`, where `openDrawer()` opens first and then fetches. The order differs
because the outcome differs: a visitor who clicked the control asked to see the
panel and is owed an answer even if it is "unavailable", while a visitor who
asked for nothing should not be handed a panel that only apologises.

The flag is written when the panel actually opens. An unconfigured deployment
therefore greets the visitor on their next visit after a key is added, rather
than burning their one chance on a version of the shop that had no assistant.

**Alternative considered:** write the flag on the attempt regardless of
availability. Rejected: it spends the visitor's only auto-open on nothing.

### The greeting stays where it is

It remains the `v-if="assistant.isEmpty"` paragraph in the drawer, and only its
words change. It is already outside `messages`, which is the array sent to the
provider, so the spec's "not in the message history" requirement holds by
construction rather than by a new guard. `reset()` empties `messages`, so the
greeting returning on a new conversation also already works.

## Risks / Trade-offs

- **A panel that opens itself is an interruption** → It opens once per browser,
  never again after a close, and closes by pointer or keyboard like any other.
  If the user finds it intrusive in practice, the flag makes it a one-line
  revert rather than an unpicking.
- **A visitor on `system` loses their way back to it** → Stated as a behavior
  change in the proposal rather than hidden. `system` is still the default for
  anyone new, still honored before first paint, and still reachable through
  `set()`. Clearing site data restores it.
- **The auto-open adds one GET per new visitor** → It is the same free
  availability check the control already makes, it ships no credential, and it
  costs no provider call.
- **The auto-open will break the Playwright suite unless it is handled** →
  Every Playwright test starts from a clean browser context, so it has no
  `assistant-greeted` flag and looks exactly like a first visit. The panel would
  open over the catalogue and swallow the "Add to cart" click, and the failure
  would look like the hydration problem recorded in handoff.md section 8 rather
  than like this change. The suite seeds the flag before the first navigation,
  which is also closer to what a returning visitor does than closing the panel
  in every test would be.
- **Two icons now come from PrimeIcons 8** → `pi-microchip-ai` is checked
  present in the installed version. If a future PrimeIcons upgrade drops it the
  symptom is a missing glyph in the navbar, not a broken page.

## Migration Plan

No migration. No schema change, no RLS change, no environment variable, no
stored value whose shape changes. A visitor with `system` stored keeps it and
keeps rendering correctly; the only difference is which icon they see and where
their next click takes them. Rollback is a revert of the commit.
