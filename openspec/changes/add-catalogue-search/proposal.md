## Why

The only way to find something in the catalogue is to read all of it. That is
fine at nine products and stops being fine at the first page of pagination,
which is the next piece of work queued after this one. A visitor who knows what
they want should be able to type it, and a shop that grows should not make
browsing the only route to an item.

The assistant can already search, through its `search_catalogue` tool, but that
costs a provider call, spends one of the visitor's 25 messages, and asks them to
hold a conversation to do something a text field does in a second.

## What Changes

- A search control in the site chrome, on every page that uses the default
  layout, alongside the assistant, contact, theme and cart controls. It takes
  the visitor to the shop page with the search field ready for typing.
- A search field beside the `Shop` heading on the shop page, filtering the
  catalogue as the visitor types.
- Matching is case-insensitive and covers an item's name and its description,
  the same fields the assistant's own search matches on today.
- Both tabs are filtered by one term. Each tab states how many of its items
  matched, and a tab with no matches says so rather than showing an empty panel.
- The term travels in the page's URL, so a search survives a reload, a shared
  link and the browser's Back button.
- Clearing the field restores the whole catalogue.

No change to the assistant: no tool, no argument, no prompt rule. No change to
what the catalogue API returns for an unfiltered request.

## Non-goals

- **Fuzzy matching, stemming, ranking or typo tolerance.** A substring match over
  name and description is what the catalogue's size justifies; anything
  cleverer is a decision for whoever adds full-text search to Postgres.
- **Searching anything but the catalogue.** Not orders, not content pages, not
  the contact form.
- **A search results page of its own.** The shop page already lists the
  catalogue; search filters that list rather than adding a second place where
  items are rendered.
- **Pagination.** It is the next task, and search is specified so that it can
  arrive on top rather than being rebuilt for it.
- **Removing or changing the assistant's `search_catalogue` tool.**

## Capabilities

### New Capabilities

- `catalog/catalogue-search`: how a visitor searches the catalogue from the
  storefront, what matches, what they are told about the result, and how the
  search is carried in the URL.

### Modified Capabilities

None. The assistant's specification is untouched, and the catalogue's existing
sale and file behavior is unchanged.

## Impact

- `app/layouts/default.vue` — a search control in the header.
- `app/pages/index.vue` — the field beside the `Shop` heading, the filtering,
  the per-tab counts and empty states.
- `server/api/products.get.ts` — an optional search term on the catalogue
  request, so the filtering has somewhere to live when the list stops being
  fetched whole.
- `server/utils/schemas.ts` — validation for that term.
- Tests: unit coverage for the matching rule, and an end-to-end pass over
  typing, filtering, clearing and reloading.

**No Supabase schema or RLS change.** The search reads the `products` table
through the existing service-role client and the columns the catalogue already
selects.
