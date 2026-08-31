## 1. Theming foundation

- [x] 1.1 Add `@custom-variant dark (&:where(.dark, .dark *));` to `app/assets/css/main.css` after the Tailwind import, and verify a temporary `dark:bg-red-500` utility responds when `.dark` is set by hand on `<html>` in devtools
- [x] 1.2 Confirm `nuxt.config.ts` still sets PrimeVue `darkModeSelector: '.dark'`, and verify a PrimeVue Badge changes surface colour with `.dark` toggled by hand

## 2. Colour mode state

- [x] 2.1 Create `app/stores/color-mode.ts` — a Pinia store with `mode: 'light' | 'dark' | 'system'` defaulting to `system`, an `isDark` getter resolving `system` against `prefers-color-scheme`, a `set(mode)` action and a `cycle()` action; verify `npx nuxc typecheck` (or `npx vue-tsc --noEmit`) passes
- [x] 2.2 Persist the store to `localStorage` under the exact key `color-mode` as a bare string (design — Decision 5), with a comment pointing at the head script; verify the key and value appear in devtools Application → Local Storage after a change
- [x] 2.3 Apply `.dark` to `document.documentElement` from a single watcher in the store, and verify no component writes to `classList` (`grep -rn "classList" app/`)

## 3. Pre-paint application

- [x] 3.1 Add the inline `app.head.script` to `nuxt.config.ts` that reads `localStorage['color-mode']`, falls back to `matchMedia('(prefers-color-scheme: dark)')`, and toggles `.dark` — wrapped in `try/catch` (design — Decisions 2 and 5); verify it runs before body render by inspecting document source order
- [x] 3.2 Verify no flash: with the preference set to `dark`, hard-reload with network throttled to Slow 3G and confirm the first painted frame is dark (spec — "No flash of the wrong scheme")
- [x] 3.3 Verify no hydration mismatch warning appears in the browser console on load in each of the three modes (design — Decision 3)

## 4. Navbar control

- [x] 4.1 Add the toggle to the navbar in `app/layouts/default.vue`, left of the cart link, wrapped in `<ClientOnly>` in line with the existing cart Badge; verify it renders on every page using the default layout
- [x] 4.2 Give the control an `aria-label` naming the action and the mode in effect, and verify it is reachable and operable by Tab + Enter/Space (spec — "Keyboard operation", "Accessible name")
- [x] 4.3 Show an icon reflecting the mode in effect (`pi-sun` / `pi-moon` from the already-installed primeicons), and verify it updates immediately on activation

## 5. Theme-aware layout

- [x] 5.1 Replace the hardcoded light utilities in `app/layouts/default.vue` (`bg-surface-50`, `bg-white`, `border-surface-200`, `text-surface-900`, `text-surface-500`) with `dark:` pairs from Aura surface tokens (design — Decision 6); verify header, main and footer all change with the toggle
- [x] 5.2 Verify WCAG AA text contrast for header links, footer text and the cart badge in both schemes using devtools' contrast checker (spec — "Legible content in both schemes")

## 6. Verification

- [x] 6.1 Verify persistence end to end: select `dark`, navigate catalogue → product → cart, reload, and confirm the scheme holds throughout (spec — "Preference persistence")
- [x] 6.2 Verify graceful degradation: block site data for localhost in the browser, load the page, and confirm it renders in `system` mode with no console error and no visible error (spec — "Unreadable storage")
- [x] 6.3 Run `npm run build` and confirm it succeeds

No Supabase migration and no new environment variable are required by any task
in this change. No new dependency is added.

## Verification deviations

- 2.1 `vue-tsc` is not installed in this project, so the typecheck could not be
  run. Behaviour was verified in a browser against both a production build and
  the dev server instead.
- 3.2 Verified by the served document (the script sits at byte 154 of `<head>`,
  the `<body>` tag at 467786) and by `document.documentElement.className`
  already reading `dark` on first evaluation after load — not by a Slow 3G
  first-frame capture.
- 6.2 The write path was verified by making `localStorage` throw a
  `SecurityError` and confirming the toggle still worked with no console error.
  The boot-time read inside pinia-plugin-persistedstate was not exercised; the
  pre-paint script's own read is covered by its `try/catch`.
