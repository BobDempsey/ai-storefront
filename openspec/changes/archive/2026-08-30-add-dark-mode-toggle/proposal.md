## Why

The storefront renders in a single hardcoded light palette, so customers
browsing at night or on a device set to dark get a bright page with no way to
change it. PrimeVue is already configured with `darkModeSelector: '.dark'`, so
the theme half of the work is done and only the toggle, the persistence and the
Tailwind side are missing.

## What Changes

- Add a `dark` class strategy driven by a `useColorMode` composable backed by a
  Pinia store, with three states: `light`, `dark` and `system`.
- Add a toggle control to the navbar in `app/layouts/default.vue`, to the left
  of the cart link.
- Persist the choice to `localStorage` so it survives reloads and navigation.
- Apply the stored preference before first paint via an inline head script, so
  there is no flash of light theme on SSR hydration.
- Register Tailwind 4's class-based dark variant in `app/assets/css/main.css`
  (`@custom-variant dark`), since Tailwind 4 defaults to `prefers-color-scheme`.
- Replace the hardcoded light utilities in the layout (`bg-surface-50`,
  `bg-white`, `border-surface-200`, `text-surface-900`) with pairs that respond
  to the dark variant.

## Non-goals

- Restyling the product, cart, checkout or order-received pages beyond what the
  shared layout covers — those get their own follow-up change.
- A custom dark palette. This change uses PrimeVue Aura's built-in dark surface
  tokens as-is.
- Any server-side persistence of the preference (no cookie, no user account, no
  Supabase column). The setting is per-browser.
- Honouring an OS theme change live while the page is open when the mode is
  `system`; the preference is read at load.

## Capabilities

### New Capabilities

- `theming/color-mode`: how the storefront chooses, persists and applies a
  light or dark colour scheme, and the navbar control that changes it.

### Modified Capabilities

None. No existing spec covers layout chrome or theming.

## Impact

- `app/layouts/default.vue` — navbar gains the toggle; layout colours become
  theme-aware.
- `app/assets/css/main.css` — adds the Tailwind `dark` custom variant.
- `app/stores/` — new colour-mode store (sits alongside the existing cart store).
- `nuxt.config.ts` — inline head script for the pre-hydration theme application.
- No Supabase schema or RLS changes. No new dependencies. No API changes.
- SSR note: the server cannot know the client's preference, so the markup is
  rendered in a neutral state and corrected by the head script before paint.
