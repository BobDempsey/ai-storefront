## Why

Swapping the assistant's icon to `pi-microchip-ai` made the control easier to
recognise once a visitor looks at it, but nothing makes them look. The panel
opening itself on a first visit made them look, and was too blunt: it takes over
the page of a visitor who asked for nothing, and it can only ever do so once per
browser, so it does nothing for the returning visitor who closed it.

A small pulsing dot does the pointing instead. It draws the eye without taking
the page, it costs no space in the navbar, and it comes back on the next page
load for a visitor who has not engaged yet. With it in place the auto-open
has nothing left to do, so it goes.

## What Changes

- The navbar's assistant control carries a small dot badge until the visitor
  opens the panel.
- The dot stops as soon as they open it, and is back after a page reload, so a
  visitor who has not engaged keeps being offered the cue rather than getting it
  once per browser and never again.
- The dot pulses. Where the visitor's browser reports
  `prefers-reduced-motion: reduce`, it is shown without animation rather than
  hidden, so the cue survives for a visitor who cannot take movement.
- **The panel no longer opens by itself.** The first-visit auto-open is removed:
  the panel opens when the visitor asks for it and at no other time. The dot is
  now the only thing that points at the assistant.
- The `assistant-greeted` flag goes with it. It existed solely to make the
  auto-open happen once per browser, and nothing else reads it.
- Nothing is stored for the dot either. It is ordinary component state, which is
  why a reload brings it back: there is nothing anywhere that remembers the
  panel was opened.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `assistant/shopping-assistant`: the control in the site chrome gains an
  attention cue, and the requirement that the panel introduces itself on a first
  visit is removed.

## Non-goals

- **No change to what the assistant can do.** No tool, no argument, no prompt
  change. This is chrome.
- **Nothing opens the panel except the visitor.** Replacing the auto-open with
  a delayed, scrolled or exit-intent version of the same idea is not in scope
  and was not the point: the dot is the cue, and the visitor decides.
- **No change to the greeting.** The copy shown in an empty panel stays exactly
  as it is; only what causes the panel to be open changes.
- **No count, no text and no unread concept.** The dot carries no number and no
  message. The assistant keeps no transcript, so there is nothing to be unread.
- **No accent colour, text label or pill button on the control.** Those were the
  other options weighed when this was chosen, and they stay unbuilt.
- **No Supabase schema or RLS change**, no migration, no new environment
  variable, and no server-side change of any kind.

## Impact

- `app/layouts/default.vue`: the assistant button gains a badge element beside
  the icon, following the cart control's existing `relative` wrapper and
  absolutely positioned badge.
- `app/utils/assistant-greeted.ts`: **deleted**, along with its tests. Nothing
  reads it once the auto-open is gone.
- `app/stores/assistant.ts`: the dot's state, which lives here and nowhere else,
  and the removal of `autoOpenOnce()`.
- `app/components/AssistantDrawer.vue`: loses the mount hook that called the
  auto-open.
- `tests/e2e/global-setup.ts` and `playwright.config.ts`: the seeded
  `storageState` existed only to stop a clean Playwright context being treated
  as a first visit. With no auto-open there is nothing to seed.
- `app/assets/css/main.css` or the layout's own styles: the pulse animation and
  its `prefers-reduced-motion` guard.
- `tests/unit/`: the dot's visibility and what clears it, minus the auto-open
  tests that no longer describe anything.
