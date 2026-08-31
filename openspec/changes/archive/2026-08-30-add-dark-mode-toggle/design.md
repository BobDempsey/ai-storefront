## Context

See proposal.md — Why. The relevant constraints:

- Nuxt 4 runs SSR. The server renders the same HTML for every visitor and has
  no signal for the visitor's colour preference, so the scheme cannot be
  decided during render without sending something to the server.
- `nuxt.config.ts` already sets PrimeVue's `darkModeSelector: '.dark'`, so
  PrimeVue component tokens flip as soon as `.dark` is present on `<html>`.
- Tailwind CSS 4 defaults its `dark:` variant to `prefers-color-scheme`. Class
  strategy is opt-in via `@custom-variant` in the CSS entry, not a JS config
  key as in Tailwind 3.
- The existing store convention is Pinia with `persist: true`
  (`app/stores/cart.ts`), backed by `pinia-plugin-persistedstate`.

## Goals / Non-Goals

**Goals:**

- One source of truth for the colour mode that both PrimeVue and Tailwind read.
- Correct first paint for a returning visitor, with no flash and no hydration
  mismatch warning.
- No new runtime dependency.

**Non-Goals:**

- Adding `@nuxtjs/color-mode`. See Decision 1.
- Server-side knowledge of the preference — no cookie is set, so pages stay
  cacheable and the preference stays off the wire.
- Theming pages beyond the default layout (proposal — Non-goals).

## Decisions

### 1. Hand-rolled Pinia store over `@nuxtjs/color-mode`

`@nuxtjs/color-mode` solves this problem well, but it brings its own module,
its own storage key and its own `.dark` class handling, which would sit beside
the Pinia + persistedstate convention already in the project for no gain — the
whole surface here is three states and one class on `<html>`.

*Alternative considered:* the module. Rejected as a dependency out of
proportion to the feature. Revisit if per-route or per-component theming is
ever needed.

### 2. Inline head script for the pre-paint application

The `.dark` class is set by a small synchronous script injected via
`app.head.script` in `nuxt.config.ts`, marked to run in `<head>` before body
render. It reads the stored key, falls back to `matchMedia('(prefers-color-scheme: dark)')`,
and toggles `documentElement.classList`. Because it runs before first paint,
the visitor never sees the wrong scheme.

*Alternative considered:* a Nuxt plugin. Rejected — plugins run after
hydration begins, which is exactly the flash the spec forbids.

### 3. The DOM class is not part of the rendered markup

The server emits `<html>` with no `.dark` class; the head script adds it before
paint. Vue therefore never renders a scheme-dependent attribute, so there is no
hydration mismatch to warn about. The store hydrates from the same storage key
after mount and stays in sync with what the script already did.

*Alternative considered:* a cookie read during SSR, letting the server emit the
right class. Rejected — it defeats route caching and sends a preference to the
server that the proposal's Non-goals keep local.

### 4. Store writes the class; components never touch the DOM

The store exposes `mode` (`light | dark | system`) and a derived `isDark`, and
a single watcher applies the class. The navbar control only calls an action.
That keeps the DOM write in one place and makes the control trivially
replaceable.

### 5. Storage key and format

A plain `localStorage` string under `color-mode`, written by both the head
script and the persisted store — the script cannot import the store, so the
two must agree on the key and on a bare string value. This is the one piece of
duplication in the design; both sites carry a comment pointing at the other.

*Alternative considered:* letting persistedstate own the key with its JSON
envelope and having the script parse it. Rejected — it couples the pre-paint
script to the plugin's serialisation format.

*Discovered during implementation:* the `pinia-plugin-persistedstate/nuxt`
module defaults its storage to **cookies**, not `localStorage`. Left at the
default, the preference was written to a `color-mode` cookie — invisible to the
pre-paint script, and sent to the server on every request, which the spec's
persistence requirement forbids. The store therefore passes
`storage: piniaPluginPersistedstate.localStorage()` explicitly. Note the
existing cart store inherits the cookie default; that is untouched here.

### 6. Layout colours use paired utilities

Each hardcoded light utility gains a `dark:` counterpart drawn from PrimeVue
Aura's surface tokens (`bg-surface-50 dark:bg-surface-950` and so on) rather
than a bespoke palette, so the layout and PrimeVue components stay consistent.

*Discovered during implementation:* those `surface-*` utilities generated no
CSS at all. `tailwindcss-primeui` is not installed and nothing defined a
`surface` palette, so every `bg-surface-*` / `border-surface-*` /
`text-surface-*` class in the app — pre-dating this change — was inert. Rather
than add a dependency the proposal rules out, `main.css` now re-exposes
PrimeVue's runtime `--p-surface-*` custom properties to Tailwind through an
`@theme` block. Aura defines the same surface scale in both colour schemes, so
light and dark still come from explicit `dark:` pairs. Trade-off: opacity
modifiers (`bg-surface-50/50`) do not work on `var()`-backed colours.

## Risks / Trade-offs

- **The inline script and the store can drift on the storage key** → both sides
  carry a comment naming the other; the key appears exactly twice in the
  codebase.
- **The inline script runs before any framework error handling** → it is
  wrapped in `try/catch` so a browser that throws on `localStorage` access
  (private mode, blocked site data) falls through to `system` rather than
  breaking the page, satisfying the spec's "Unreadable storage" scenario.
- **A `system`-mode visitor who changes their OS theme mid-session sees no
  change** → accepted and recorded in the proposal's Non-goals; adding a
  `matchMedia` listener later is a contained follow-up.
- **Pages beyond the default layout still carry hardcoded light utilities** →
  the chrome will be dark while page bodies stay light until the follow-up
  change lands. Visible but not broken; worth sequencing the follow-up soon.

## Migration Plan

Additive and client-only. No data migration, no schema change, no API change.
Rollback is reverting the commit — a stale `color-mode` key left in a visitor's
`localStorage` is inert.
