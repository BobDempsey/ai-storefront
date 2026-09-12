## Why

The shop page fetches the whole catalogue and renders every row. That is fine at
nine products and gets worse with each one added: a visitor on a phone scrolls
past everything to reach the footer, and the page's weight grows without limit.
Search landed first on the understanding that pagination would follow, and its
filtering was built in SQL for exactly this reason.

The catalogue is also too small to exercise what is being built, so this change
seeds six more products alongside it.

## What Changes

- The catalogue request takes a page number and a kind, and answers with one
  page of items plus how many there are in total. **BREAKING** for the response
  shape: `/api/products` returns `{ items, total, page, perPage }` rather than a
  bare array.
- Six items a page, which is two rows of the three-column grid.
- Each tab paginates on its own, with its own controls and its own page number,
  because the two hold different numbers of items.
- The page number travels in the URL beside the search term, so a page can be
  reloaded and shared, and Back steps between pages.
- Searching returns to the first page, since page four of the old results means
  nothing against the new ones.
- Controls appear only when there is more than one page.
- Six more demo products are seeded, so the catalogue has twelve printed goods
  and pagination is visible rather than theoretical.

## Non-goals

- **Paginating the assistant's `search_catalogue`.** It answers with a short
  list for a model to read, not a page for a person to scroll.
- **Infinite scroll or a load-more button.** Numbered pages were chosen with the
  user: they keep the URL describing what is on screen, which the other two
  give up.
- **Sorting or filtering beyond the existing search.** The order stays the
  order rows were created in.
- **Paginating the quick search panel.** It shows the top few matches and hands
  a longer search to the catalogue page, which is the thing that paginates.
- **Photographs for the new products.** They carry generated placeholder images,
  and a real shop replaces them.

## Capabilities

### New Capabilities

- `catalog/catalogue-pagination`: how the catalogue is split into pages, what a
  page request and its answer carry, and how paging interacts with search.

### Modified Capabilities

None. `catalog/catalogue-search` keeps every requirement it has; how searching
and paging meet is stated in the new capability above, since the search change
is not archived yet and its main spec does not exist to delta against.

## Impact

- `server/api/products.get.ts` — page, kind and a total on the response.
- `server/utils/schemas.ts` — validation for the page and page size.
- `app/pages/index.vue` — two independently paginated tabs.
- `app/components/SearchPalette.vue` — reads `items` off the new shape.
- `supabase/seed.sql` and the live `products` rows — six more products.
- `public/images/` — six generated placeholder images.
- Tests: unit coverage for the page maths, database coverage for the new
  response shape, and an end-to-end pass over paging and its URL.

**No Supabase schema or RLS change.** New rows go into the existing `products`
table through the service-role client; no column is added or altered.
