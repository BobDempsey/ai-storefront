## Why

The navbar gives the shop assistant the same weight as every other icon, and
`pi-comments` reads as a message thread rather than a chatbot, so visitors pass
it without knowing the shop has an assistant at all. The theme control has the
opposite problem: it cycles through three modes, and its third icon
(`pi-desktop`) asks a visitor to think about an operating-system setting before
they have looked at a single product. This change makes the assistant the thing
a visitor notices and the theme control the thing they do not have to think
about.

## What Changes

- The navbar theme control becomes a two-state toggle between light and dark.
  `pi-desktop` is gone from the navbar, so a visitor is never shown a system
  option. **This is a behavior change, not a cosmetic one**: a visitor can no
  longer return to `system` once they have chosen a scheme.
- `system` stays the default for a visitor with no stored preference, stays
  honored by the pre-paint script, and stays a valid stored value. The store
  keeps the mode, its `isDark` branch and `set()`, so the capability survives
  even though the navbar no longer reaches it. A visitor still on `system` sees
  the icon for the scheme actually in effect.
- The navbar's assistant button swaps `pi-comments` for `pi-microchip-ai`.
- The assistant panel opens itself once, on a visitor's first visit, and never
  again after that visitor has closed it. The flag that records this lives in
  the visitor's browser, beside the colour-mode preference.
- The panel's opening message greets the visitor in the assistant's own voice.
  The approved copy is: "Hi, I'm the shop assistant. Ask me about anything:
  info on a product, what is in your cart, or how ordering works. I can add
  things for you and draft an order, but you confirm it yourself."

## Capabilities

### New Capabilities

None. Both affected capabilities already have specs.

### Modified Capabilities

- `theming/color-mode`: the navbar control offers two modes rather than three.
  The three modes themselves, the default, persistence and the pre-paint rule
  are unchanged, so only the control's requirement moves.
- `assistant/shopping-assistant`: the panel gains a first-visit auto-open and
  a greeting that introduces the assistant. What the assistant may do, and
  everything it must never do, is untouched.

## Non-goals

- **No change to what the assistant can do.** No new tool, no change to
  `TOOL_NAMES`, no change to the system prompt's rules about promo codes. The
  greeting is copy rendered by the drawer before any conversation starts, and
  the model never sees it.
- **No provider call on auto-open.** The panel opening does not send a message,
  so a visit that opens the panel and closes it again costs nothing.
- **No settings page and no third theme control.** A visitor who wants `system`
  back clears site data. Building a menu to offer all three modes is a separate
  change if it is ever wanted.
- **No attention-drawing beyond the icon swap and the auto-open.** Accent
  colour, a text label, a badge and an animation were all considered and set
  aside for now.
- **No Supabase schema or RLS change.** This change touches no table, no
  policy and no migration, and adds no environment variable.

## Impact

- `app/layouts/default.vue`: the `themeIcon` computed, the theme button's
  handler and label, and the assistant button's icon.
- `app/stores/color-mode.ts`: a two-state toggle action replaces `cycle()` as
  what the navbar calls. `MODES`, `set()` and the persistence block stay as
  they are.
- `app/stores/assistant.ts`: the first-visit flag and the action that decides
  whether to auto-open.
- `app/components/AssistantDrawer.vue`: the empty-state greeting copy.
- `tests/unit/`: the colour-mode toggle and the auto-open decision are both
  pure logic and are covered there. No database test and no provider call.
- No server route, no API contract and no email template changes.
