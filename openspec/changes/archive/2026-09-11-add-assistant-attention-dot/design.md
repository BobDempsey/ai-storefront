## Context

See proposal.md for motivation. The constraints that shape the approach:

- **The first-visit auto-open is being removed by this change**, along with the
  `assistant-greeted` localStorage flag that gated it. Both shipped a few hours
  earlier in `refresh-navbar-and-assistant-entry`. The dot covers the same need
  without taking the page, and keeping both would have the auto-open clear the
  dot before a first-time visitor ever saw it.
- **The cart control is the existing badge precedent.** It puts a `relative` on
  the control and an absolutely positioned `Badge` at `-right-1 -top-1`, inside
  `ClientOnly`, with an `sr-only` span where the badge carries meaning. The
  assistant control has no `relative` today.
- **Tailwind's `dark:` here is class-driven**, not `prefers-color-scheme`, and
  the `surface` scale is identical in both schemes. So a colour that works in
  one scheme is not automatically legible in the other, and the layout's
  convention is explicit `dark:` pairs rather than tokens that flip.
- **The store is not persisted and must stay that way.** Whatever holds the
  dot's state must not turn the assistant store into something with a `persist`
  block, because the conversation is the thing that must never be persisted.

## Goals / Non-Goals

**Goals:**

- Leave exactly one thing pointing at the assistant, rather than two that
  interfere with each other.
- Keep the dot's visibility decision testable without a browser.
- Match the cart badge's structure so the navbar has one way of doing this.
- Remove the auto-open cleanly: its flag, its tests, and the Playwright seeding
  that existed only to work around it.

**Non-Goals:**

- No PrimeVue `Badge` for the dot. It carries no value, and `Badge` exists to
  render one.
- No animation library and no new dependency.

## Decisions

### The auto-open goes rather than being kept alongside the dot

Both cannot stand. `autoOpenOnce()` runs on mount and writes `assistant-greeted`,
so a first-time visitor would have the panel opened over their first page and the
dot cleared in the same tick: the cue would be spent before it was seen, and the
visitor most in need of an introduction is the one who never gets the gentler
version of it.

Choosing between them, the dot is the better of the two. It points without
taking the page, and it comes back on every page load, where the auto-open fired
once per browser and then had nothing left to give a returning visitor.

Removing it takes `assistant-greeted` with it. Nothing else reads that flag, so
leaving the module in place would be a file whose docblock describes a behaviour
the app no longer has, which is the kind of thing that survives for years.

The seeded Playwright `storageState` goes for the same reason. It exists only
because a clean browser context looked like a first visit; with nothing opening
itself, a clean context is just a visitor.

**Alternative considered:** keep the auto-open and drop the dot, since the
auto-open already shipped. Rejected on the user's call, and the reasoning above
is why it is the right one: the auto-open cannot reach a returning visitor at
all.

### The dot is plain store state, stored nowhere

`showDot` on the assistant store, defaulting to true, cleared by `openDrawer`.
No localStorage, no sessionStorage, no module of its own.

"The dot comes back on a refresh" is the behaviour asked for, and it falls
straight out of this: the Pinia store is rebuilt on every page load, so the
default is the refresh behaviour rather than something an expiry rule has to
produce. Navigating inside the app does not bring it back, because client-side
navigation does not rebuild the store, which is the right split: a visitor
moving between pages has not started again, a visitor reloading has.

This replaced a sessionStorage flag (`assistant-panel-opened`) written earlier in
this change, when the cue was meant to last a browsing session. That flag was
strictly more machinery for a weaker behaviour, and it is gone along with its
module and its tests.

It also removes a branch rather than adding one. With nothing stored there is no
storage-failure case, so a private-mode browser now gets exactly the same dot as
any other, where the flagged version deliberately showed it none.

**Alternative considered:** keeping the flag and clearing it on `beforeunload`.
Rejected as a way of making storage imitate not using storage.

### The dot is a `span`, marked `aria-hidden`

A `span` styled as a dot rather than a `Badge`, because there is no value to
render. It is `aria-hidden="true"` and gets no `sr-only` companion, which is
where it parts company with the cart badge: the cart's badge stands in for a
count a screen-reader user would otherwise miss, while the dot says only "look
here", which the control's existing accessible name already covers. Announcing
it would be noise, not parity.

### The pulse is local CSS with a reduced-motion guard

A keyframes rule and its `@media (prefers-reduced-motion: reduce)` guard, kept
next to the markup in the layout's own `<style>` rather than added to
`app/assets/css/main.css`. That file is the global layer and token setup; a
single component's animation does not belong in it.

The guard turns the animation off and leaves the dot visible. Hiding it would
take the cue away from exactly the visitors most likely to be browsing with
motion reduced for accessibility reasons, and with the auto-open gone the dot is
the only cue there is.

**Alternative considered:** Tailwind's `animate-pulse`. It animates opacity down
to 0.5 and back, which reads as a fade rather than a pulse, and it carries no
reduced-motion guard of its own in this setup. A local keyframes rule is a few
lines and says exactly what it does.

### Colour comes from an explicit light/dark pair

The dot takes a colour with an explicit `dark:` counterpart, following the
layout's stated convention, rather than a single `surface` token. The scale does
not flip between schemes here, so one value cannot be legible against both the
light and the dark header.

## Risks / Trade-offs

- **A first-time visitor now gets a smaller nudge than they did this morning**
  → Deliberate. The auto-open's nudge was large enough to be an interruption,
  and it reached each browser once. The dot reaches the same visitor on every
  page load until they engage.
- **A pulsing dot is the most intrusive of the remaining options weighed** → It
  is small, carries no text, stops the moment the panel opens, and is one flag
  away from being removed. The reduced-motion guard covers the visitors for whom
  movement is a genuine problem rather than a preference.
- **A repeat visitor sees the dot on every refresh, however often they have used
  the assistant** → Accepted deliberately: the user asked for the refresh
  behaviour, and the cue is small, silent and cleared by the click it is asking
  for. If it wears out its welcome, the fix is a stored flag again, which is the
  thing this decision removed.
- **Removing a behaviour that shipped hours ago churns the spec** → The main
  spec gains and loses a requirement on the same day. Recording it as a REMOVED
  delta with its reason is what keeps that legible later, rather than quietly
  editing the accepted spec as though the auto-open never existed.

## Migration Plan

No migration. No schema change, no environment variable, no stored value whose
shape changes. A visitor still holding `assistant-greeted` is unaffected: nothing
reads it, and it expires with their site data. Nothing new is stored in its
place. Rollback is a revert of the commit.
