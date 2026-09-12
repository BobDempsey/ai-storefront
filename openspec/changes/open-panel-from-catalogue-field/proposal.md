## Why

The shop page and the navbar each offer a way to search, and they do not behave
the same. The navbar opens a panel that lists the catalogue, narrows as you
type, and is operable from the keyboard. The field beside the `Shop` heading
filters the page in place and does none of those things.

A visitor who clicks the field on the shop page therefore gets the weaker of
the two searches, and nothing tells them the better one exists.

**This modifies an accepted requirement.** `catalog/catalogue-search` says the
catalogue page's field narrows the catalogue as the visitor types. After this
change it opens the panel instead, and the panel does the narrowing.

## What Changes

- **Clicking or focusing the catalogue page's search field opens the quick
  search panel**, with whatever is already typed carried into it, rather than
  filtering the page underneath.
- **The store carries a seed term.** `openPalette()` takes the term to start
  from, so the panel opens showing results for what the visitor had already
  typed rather than making them type it again.

## What This Does Not Change

- **The URL is still the state.** A `?q=` in the address still filters the shop
  page on load, still survives a reload and is still what the panel's "see all"
  row writes. Only the field stops being the thing that edits it directly.
- **The panel is unchanged.** Same matching rule, same keyboard handling, same
  "see all" row.
- **The field still shows the active term**, so a visitor who arrived from a
  shared link can read what was searched.

## Non-goals

- **No second panel, and no change to the navbar control.** Both entry points
  open the one panel, which is the whole point.
- **No removal of the field.** It still shows the term and still clears it.

## Risks

- **A keyboard visitor tabbing through the page now opens a panel.** That is a
  panel over the page they were reading, which is the thing the assistant's
  auto-open was removed for. Mitigated by the panel closing on Escape and
  returning focus, but it is the part to watch.
