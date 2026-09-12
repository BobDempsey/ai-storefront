## Context

See proposal.md for motivation. What shapes the approach:

- `/api/products` returns a bare array today, and three callers read it: the shop
  page, the quick search panel, and `tests/db/catalogue-search.test.ts`. All
  three are in this repo, so the response shape can change in one commit.
- Search already filters in SQL (`or=(name.ilike,description.ilike)`) precisely
  so that a page of results would be a page of matches. That decision is what
  makes this change small.
- The shop page splits one response into two tabs with computed filters. Paging
  them independently means each tab needs its own request.
- The catalogue holds nine rows, six of them printed goods, so at six a page
  nothing would page. Six more products are seeded with this change.

## Goals / Non-Goals

**Goals:**

- One request per tab, each answering with its own page and its own total.
- The address describes what is on screen: the term and both page numbers.
- Nothing about pricing, the sale or the cart changes.

**Non-Goals:**

- A generic pagination component. Two call sites do not justify one.
- Keyset or cursor paging. Offsets are correct for a catalogue this size and
  ordered by a stable `created_at`.

## Decisions

**The response becomes `{ items, total, page, perPage }`.** A bare array cannot
carry a total, and a total is what the paging controls and the per-tab counts
both need. Returning it in the body rather than in a `Content-Range` header
keeps every consumer reading one JSON object instead of two places.

**`kind` moves onto the request, and each tab fetches its own page.** The
alternative is one request per page holding both kinds, which cannot page them
independently: six printed goods and three files share no page two. Two requests
where there was one is the cost, and both are cached by `useFetch` under their
own keys.

**Supabase's `range()` plus `count: 'exact'`.** `select('…', { count: 'exact' })`
returns the matched total alongside the page in a single round trip, with the
filter applied before the range, so a page of a search is a page of matches. At
nine or twenty rows the exact count is free; a catalogue large enough for
`estimated` to matter is a different conversation.

**Page numbers live in the URL as `page` and `filePage`, one-based.** One-based
because the number is shown to a person. Two parameters rather than one, because
the tabs page independently and a shared number would put the files tab past its
end whenever the products tab paged forward. The first page writes no parameter
at all, so today's plain `/` stays the address of an unpaged catalogue.

**Paging uses `router.push`, where searching uses `replace`.** A page change is
a deliberate step a visitor expects Back to undo. Typing is not: it happens a
letter at a time, which is why the search field keeps its debounce and its
`replace`. The two behaviours are different on purpose.

**Changing the term resets both page numbers in the same URL write.** Not in a
watcher after the fact, which would flash the old page number and put a useless
entry in the history.

**PrimeVue's `Paginator`, not a hand-rolled control.** It already handles the
phone case the spec requires: page-number links collapse and the control reduces
to arrows with the current page. Using it means the accessibility work is done
and the shop's theme applies without extra styling.

**The quick search panel does not page.** It reads `items` off the new shape and
keeps its cap of eight, handing anything longer to the catalogue page through
the row it already shows.

**The six new products are seeded in both places, as the description rewrite
was.** `supabase/seed.sql` for a fresh project and the live `products` rows for
the running shop; writing only one leaves the site unchanged or a new project
short. They carry generated placeholder images rather than photographs, named
`<slug>.jpg` like the rest, so a real shop replaces the file and changes no code.

## Risks / Trade-offs

- **Two requests per page view instead of one** → both are small and run in
  parallel; the catalogue read is about 0.2s warm.
- **The response shape is breaking** → every consumer is in this repo and is
  changed in the same commit, and `test:db` asserts the new shape.
- **An offset page can shift under an insert** → a staff member adding a product
  while a visitor is on page two could move one item across a page boundary. The
  order is `created_at` ascending, so an insert lands at the end and only the
  last page moves. Not worth cursor paging for this shop.
- **Placeholder images look like placeholders** → deliberate, and the proposal
  says so; the alternative is a stock photo pretending to be the shop's own
  product.

## Migration Plan

No schema change and no environment variable. The seeded rows are ordinary
catalogue rows and can be deleted by slug if the demo catalogue is unwanted. The
response-shape change ships in one commit with its consumers, so there is no
window where a deployed page reads the wrong shape; rolling back is reverting
the commit.
