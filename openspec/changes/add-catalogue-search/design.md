## Context

See proposal.md for motivation. What shapes the approach:

- The shop page fetches the whole catalogue in one call, `useFetch('/api/products')`,
  and splits it into the Products and Files tabs with two computed filters. Nine
  rows today.
- `server/utils/assistant.ts` already searches, and does it by fetching the
  catalogue and running a lowercase `includes()` over `name` plus `description`.
  That rule is the one visitors have been getting through the assistant, so the
  storefront matching the same rule keeps one answer rather than two.
- Pagination is the next queued task. Whatever search does now has to survive a
  page of items arriving rather than the whole list.
- The catalogue API prices rows with `withSalePricing` before returning them,
  and the assistant's search path does the same. Filtering must not sit between
  a row and its pricing.

## Goals / Non-Goals

**Goals:**

- One matching rule, defined once, used by the storefront and available to
  anything else that needs it.
- A search that is correct when the page holds the whole catalogue and stays
  correct when it holds one page of it.
- No new dependency, no new table, no new index.

**Non-Goals:**

- Postgres full-text search, `tsvector`, trigram indexes or a search service.
  The catalogue is nine rows; this is a decision for whoever passes a few
  hundred.
- Debounce tuning as a user-visible feature. It is an implementation detail of
  keeping the URL sane, not a behavior the spec names.

## Decisions

**Match on the server, through a `q` parameter on `/api/products`.**
The alternative is filtering the already-fetched array in the browser, which is
less code today and wrong the moment pagination lands: a client filter can only
search the page it holds, so a visitor would search 12 of 40 items and be told
the shop has nothing. Putting the term on the request means the answer comes
from the catalogue rather than from whatever slice the page happens to have.
Cost: a round trip per search rather than none. Mitigated by the debounce below,
and the catalogue read is about 0.2s warm.

**Keep the containment rule, and move it into `server/utils/` so both callers
share it.** A single `matchesSearch(row, term)` (or a query builder that
produces the same result) replaces the inline `includes()` in
`server/utils/assistant.ts`. Two copies of a matching rule drift, and the
assistant already being the shop's second search is exactly the case where they
would. The rule itself does not change, so the assistant's behavior does not
change and its tests keep passing.

**Filter in SQL with `ilike`, not in JavaScript after the fetch.** PostgREST's
`or=(name.ilike.*term*,description.ilike.*term*)` is what survives pagination:
the database applies the term before the range, so a page of results is a page
of matches. `ilike` is case-insensitive by definition, which is the rule the
spec states. The term is escaped for `%` and `_` before it goes near a pattern.
Trade-off: without an index this is a sequential scan, which is free at this
size and is the thing to revisit at a few hundred rows.

**The URL is the state, and the field is bound to it.** `useRoute().query.q`
feeds the fetch key so `useFetch` refetches on change, which is what makes
reload, sharing and Back work without separate code for each. The field writes
to the URL with `router.replace` rather than `push`, so ten keystrokes do not
become ten history entries; the spec's Back requirement is satisfied by
`replace` alone rather than by any history bookkeeping.

**Debounce the URL write at roughly 250ms.** Without it every keystroke is a
request and a URL write. With it the visitor types a word and one request goes.
The field itself stays uncontrolled-fast: what the visitor typed shows
immediately, and only the URL and the fetch lag behind.

**The navbar control is a link to `/?focus=search`, not a popover.**
A second search input in the header is two places to type one term, and they
disagree the moment one is stale. The header control navigates to the page that
already holds the field and focuses it. On the shop page itself it focuses
without navigating. It also means the header gains an anchor and no state.

**Per-tab counts are derived, not fetched.** Both tabs come from the same
filtered response, so the counts are `physical.length` and `files.length`. No
second request, and the two numbers cannot disagree with the lists above them.

## Risks / Trade-offs

- **A request per search term instead of a local filter** → debounced, and the
  catalogue read is a single indexed-by-nothing scan over nine rows. Revisit
  when the catalogue is large enough for pagination to matter, which is the same
  point at which the client filter would have broken anyway.
- **`ilike` patterns take `%` and `_` as wildcards** → the term is escaped
  before interpolation, and a unit test searches for a literal `%` to pin it.
- **A slow network makes the list lag the typing** → the field never waits on
  the request, and the existing pending state on the fetch is what the list
  renders against, so the visitor sees their own typing immediately.
- **Moving the assistant's matching into a shared helper touches a tested path**
  → the rule is unchanged and `tests/unit/assistant-read-tools.test.ts` covers
  it; if that suite goes red the refactor is wrong, not the tests.
- **`focus=search` is a query parameter that is not a search** → it is stripped
  from the URL once focus lands, so it never gets shared or reloaded into a
  second focus.

## Migration Plan

No data migration, no schema change, no new environment variable. The API change
is additive: `/api/products` with no `q` returns exactly what it returns today,
so a deployed browser holding the old page keeps working through the deploy.
Rolling back is reverting the commit.
