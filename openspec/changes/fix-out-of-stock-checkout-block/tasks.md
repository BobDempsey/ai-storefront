No task below needs a Supabase migration or a new environment variable, and
none touches `supabase/schema.sql` or an RLS policy.

## 1. Server: make the 409 actionable

- [x] 1.1 In `server/api/orders.post.ts`, on an `unavailable_item` error from `create_order`, re-select the submitted product ids from `products` and attach the ids that are absent or `in_stock = false` as `data.unavailableProductIds` on the 409; verify by POSTing an order containing an out-of-stock product id with curl and seeing the ids in the response body
- [x] 1.2 Make that lookup best-effort — if the re-select itself errors, log it and return the 409 with an empty `unavailableProductIds` rather than turning it into a 500; verify by pointing the client at a bad table name temporarily and confirming the status is still 409
- [x] 1.3 Confirm the 400 and 502 branches and the success path are untouched; verify with a valid order (201-equivalent success payload) and an empty-items POST (400)

## 2. Cart page: mark, block, and keep

- [x] 2.1 In `app/pages/cart.vue`, add an `unavailableLines` computed derived from `preview.lines` where `in_stock` is false; verify it is empty for an all-in-stock cart and lists the right line when a product is marked out of stock in Supabase and the page is reloaded
- [x] 2.2 Keep the existing `missing[]` auto-remove exactly as it is and confirm nothing removes out-of-stock lines; verify by reloading the cart twice with an out-of-stock product and seeing the line still present
- [x] 2.3 Mark each unavailable line with text stating it cannot be ordered, using the layout's `bg-surface-0 dark:bg-surface-900` card convention rather than a hardcoded surface; verify the line is legible in both light and dark mode
- [x] 2.4 Give each unavailable line a removal control that clears just that line; verify the item count and subtotal update immediately after activating it
- [x] 2.5 Add a note beside the subtotal, shown only when `unavailableLines` is non-empty, saying unavailable items are excluded; verify with a mixed cart that the subtotal equals the in-stock lines and the note appears
- [x] 2.6 Disable "Continue to checkout" while `unavailableLines` is non-empty and render a message naming the products to remove; verify the button re-enables without a reload once the last unavailable line is removed
- [x] 2.7 Handle the all-unavailable cart with a message saying nothing in the cart can currently be ordered; verify by marking every seeded product in the cart out of stock

## 3. Checkout page: refuse to submit an unavailable line

- [x] 3.1 In `app/pages/checkout.vue`, derive the same `unavailableLines` from its own preview and block `submitOrder` while it is non-empty, showing which products must be removed and a link back to the cart; verify by opening `/checkout` directly with an out-of-stock line in the cart
- [x] 3.2 Refresh the preview immediately before submitting, and abort the submit if that refresh reveals an unavailable line; verify by marking a product out of stock in Supabase while sitting on the checkout page, then submitting
- [x] 3.3 On a 409, read `data.unavailableProductIds`, refresh the preview, and surface the affected product names; verify the message names the product rather than showing the generic sentence
- [x] 3.4 Confirm a 409 leaves the cart intact and the typed form values in place; verify by filling the form, triggering a 409, and checking name/email/phone/notes are still populated and the other lines still in the cart
- [x] 3.5 Confirm removing the named line makes submission succeed without re-entering details; verify end to end against the live database

## 4. Types and integration check

- [x] 4.1 Update `app/types/index.ts` if the 409 payload or preview shape is referenced from typed code, keeping `CartPreview` accurate; verify with `npx nuxt typecheck` (or `npx vue-tsc --noEmit`) reporting no new errors
- [ ] 4.2 Walk the whole flow against the live Supabase project — in-stock order succeeds, out-of-stock line blocks at the cart, deleted product still auto-removes, 409 recovery works — and verify no console errors and no hydration warnings in either colour scheme (flows and both colour schemes verified; console capture at page load is not available through the MCP browser tool, so the console half of this check is still open)
- [x] 4.3 Update `handoff.md`: strike the "Out-of-stock lines are a checkout dead end" entry in section 9 and note the new 409 response field in section 5; verify the document no longer describes the fixed behaviour as open
