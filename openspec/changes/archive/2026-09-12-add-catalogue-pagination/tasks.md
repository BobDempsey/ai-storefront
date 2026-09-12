## 1. The catalogue request

- [x] 1.1 Add `page`, `perPage` and `kind` to the catalogue query schema in `server/utils/schemas.ts`, one-based with a maximum page size; verify unit tests accept a plain page, default a missing one and reject an oversized `perPage`
- [x] 1.2 Answer `/api/products` with `{ items, total, page, perPage }` using `range()` and an exact count, filter and kind applied before the range; verify `curl '/api/products?page=2'` returns the items after the first page and the same total
- [x] 1.3 Return an empty page with the true total for a page past the end rather than an error; verify with a page number beyond the catalogue

## 2. The shop page

- [x] 2.1 Fetch each tab's page separately, keyed on the term and that tab's page; verify both tabs render their own items with one request each
- [x] 2.2 Carry the page numbers in the URL as `page` and `filePage`, one-based, writing nothing for the first page and using `push` so Back steps between pages; verify by paging forward and pressing Back
- [x] 2.3 Reset both page numbers in the same URL write when the term changes; verify by searching from page two and landing on the first page of the results
- [x] 2.4 Render a `Paginator` under each tab, shown only when that kind has more than one page, and take the per-tab counts from `total` rather than the rendered length; verify with a term matching more than a page

## 3. The quick search panel

- [x] 3.1 Read `items` off the new response shape and keep the cap of eight; verify the panel still lists the catalogue and narrows as before

## 4. More products to page through

- [x] 4.1 Write six more printed products into `supabase/seed.sql`, each with a name, a paragraph description, a price and a slug matching its image; verify the file is valid SQL by reading it back
- [x] 4.2 Generate a placeholder image per new product into `public/images/<slug>.jpg`, headlessly through the Playwright already in the repo; verify each answers 200 from a running dev server
- [x] 4.3 Insert the same six rows into the live `products` table through the service-role endpoint; verify `/api/products?kind=physical` reports a total of 12

## 5. Tests

- [x] 5.1 Unit-test the page maths: the range for a page, a page past the end, the default page and the page-size cap; verify `npm test` is green
- [x] 5.2 Update `tests/db/catalogue-search.test.ts` for the new response shape and add page coverage: two pages do not overlap, the total is the whole match, and an oversized `perPage` is refused; verify `npm run test:db` passes
- [x] 5.3 Extend the end-to-end suite over paging, the URL, Back, and searching from a later page, with no provider call; verify `npm run test:e2e` passes

## 6. Verification

- [x] 6.1 Drive a dev server through paging at 1280px and 390px in both schemes; verify the controls fit the phone width and the page does not scroll sideways
- [x] 6.2 Confirm paging changes nothing else: sale prices, the cart and placing an order all behave as before; verify by ordering from page two
- [x] 6.3 Run `npm test`, `npm run build`, `npm run test:e2e` and `npm run test:db`; verify all four pass
- [x] 6.4 Update `handoff.md` and `tasks.md` with what shipped and what was decided
