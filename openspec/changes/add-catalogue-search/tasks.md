## 1. The matching rule

- [x] 1.1 Add a search helper in `server/utils/` that normalises a term (trim, treat empty or whitespace-only as no search) and escapes `%` and `_` before it reaches an `ilike` pattern; verify with unit tests over an empty term, a whitespace term and a literal `%`
- [x] 1.2 Point `search_catalogue` in `server/utils/assistant.ts` at that helper instead of its inline `includes()`; verify `npm test` still passes `tests/unit/assistant-read-tools.test.ts` unchanged
- [x] 1.3 Add a Zod schema for the search term in `server/utils/schemas.ts`, capping its length; verify a unit test rejects an over-long term and accepts an ordinary one

## 2. The catalogue API

- [x] 2.1 Accept an optional `q` on `GET /api/products` and filter with `or=(name.ilike,description.ilike)` before ordering; verify `curl '/api/products?q=dragon'` returns only matching rows and `/api/products` returns all nine
- [x] 2.2 Confirm a filtered row still carries sale pricing; verify by requesting a term that matches a discounted item while the sale is on and checking the response prices match the unfiltered response's

## 3. The shop page

- [x] 3.1 Add the search field beside the `Shop` heading with a clear control, bound to `route.query.q`, writing back with `router.replace` debounced at ~250ms; verify by typing in a dev server that the URL updates once per word and Back leaves the page
- [x] 3.2 Key the catalogue `useFetch` on the term so it refetches when the term changes; verify the list narrows as typed and a reload reproduces the same results
- [x] 3.3 Show each tab's match count, and a plain "nothing here matched" in a tab with no matches; verify both by searching a term that hits only files
- [x] 3.4 Show a whole-page empty state naming the term and offering to clear it when neither kind matched; verify with a nonsense term

## 4. The navbar control and the quick search panel

- [x] 4.1 Add a search control to the header in `app/layouts/default.vue`, matching the existing controls' size, hover and aria-label; verify it is reachable by Tab and legible in both colour schemes
- [x] 4.2 Open a quick search panel from it, over the page the visitor is on, with its own field focused and the catalogue already listed; verify from the cart page that the URL does not change and nine items are listed
- [x] 4.3 Narrow the panel as the visitor types, through the same `/api/products?q=` the shop page uses; verify "dice" leaves the two dice items
- [x] 4.4 Make it keyboard-operable: arrows move the highlight, Enter opens the highlighted item, Escape closes without searching, Ctrl+K toggles it; verify each in a browser
- [x] 4.5 Offer a row that carries the typed term to the catalogue page, and browsing everything when nothing is typed; verify it lands on `/?q=<term>` with the field filled

## 5. Tests

- [x] 5.1 Unit-test the matching rule: a name hit, a description-only hit, a case-insensitive hit, a miss, an empty term and a literal `%`; verify `npm test` is green
- [x] 5.2 Extend the end-to-end suite over typing, filtering, clearing, reloading a searched URL and the per-tab counts, with no provider call; verify `npm run test:e2e` passes and makes no request to `/api/chat`
- [x] 5.3 Add a database-backed check that `/api/products?q=` matches what the assistant's `search_catalogue` returns for the same term; verify `npm run test:db` passes with a dev server running

## 6. Verification

- [x] 6.1 Drive a dev server through search at 1280px and 390px, in both colour schemes; verify the field, the counts and the empty states read correctly at both widths
- [x] 6.2 Confirm a search changes nothing else: place an order from a searched catalogue and check the cart survives searching and clearing; verify against the order the API returns
- [x] 6.3 Run `npm test`, `npm run build` and `npm run test:e2e`; verify all three pass
- [x] 6.4 Update `handoff.md` and `tasks.md` with what shipped and what was decided
