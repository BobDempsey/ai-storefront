**This change alters the Supabase schema.** Tasks 1.1 to 1.3 and 1.5 add columns
and constraints to `public.products` and `public.order_items` and replace
`create_order`, and must be run in the SQL editor against the existing project
before the app code is deployed. No RLS policy changes: the catalogue's public
select policy already covers the new columns. No new environment variable.

## 1. Schema

- [x] 1.1 Add to `public.products` in `supabase/schema.sql`: `kind text not null default 'physical'` with a check over `('physical','digital')`, plus nullable `file_name`, `file_format` and `file_size_bytes bigint`; write them as `alter table ... add column if not exists` after the `create table` block so the file still runs on a fresh project and on the existing one; verify by running the whole file twice in the SQL editor with no error and the six existing rows reading `physical`
- [x] 1.2 Add two check constraints to `public.products`: a digital row has all three file columns and a physical row has none, and `in_stock` is true whenever `kind = 'digital'`; verify by attempting an insert of a digital row missing `file_format` and an update setting a digital row out of stock, and seeing both rejected
- [x] 1.3 Add `file_name_snapshot text` to `public.order_items` and set it in `create_order`'s insert from the joined product row, leaving the rest of the function untouched; verify by ordering one file row and one physical row and reading the two `order_items` rows back, the file line carrying the name and the physical line null
- [x] 1.4 Replace the three demo entries in `supabase/seed.sql` with real digital rows carrying slug, name, description, price, kind, file name, format and size in bytes, keeping `on conflict (slug) do nothing`; verify by re-running the seed and seeing no duplicate rows
- [x] 1.5 Guard the one-per-file cap in `create_order`: after the duplicate ids are summed, raise the existing `invalid_item` when a line whose product is digital carries a quantity above one; verify by calling the RPC directly with a file line of quantity two and seeing it rejected with no order row written

## 2. Server

- [x] 2.1 Select the new columns in `server/api/products.get.ts` and `server/api/products/[slug].get.ts`; verify `/api/products` returns `kind` on every row and the file facts on the digital ones
- [x] 2.2 Read `file_name_snapshot` in the `order_items` re-read in `server/api/orders.post.ts` and pass it through to `sendOrderEmail`; verify the route still returns `{ orderId, totalCents }` for an order with no file lines
- [x] 2.3 Mark file lines in the staff email in `server/utils/email.ts`, naming the file owed for each and saying nothing about files when an order has none, with every new interpolated value going through `esc()`; verify by placing one mixed order and one physical-only order and reading both delivered mails

## 3. Storefront

- [x] 3.1 Add `kind` and the three file fields to `Product` in `app/types/index.ts`, typed so a consumer has to check the kind before reading them; verify `npm run build` type-checks
- [x] 3.2 Add a byte formatter to `app/utils/` alongside `formatMoney`; verify it renders bytes, kilobytes and megabytes with the seed values
- [x] 3.3 Delete `demoFiles` from `app/pages/index.vue` and partition the fetched catalogue into the two tabs by kind, mapping format to a PrimeIcons class with a fallback for an unknown format; verify both tabs list only their own kind and the Files tab is empty rather than sampled when no digital rows exist
- [x] 3.4 Replace the disabled Download button on the file card with Add to cart, and state that the file is emailed once payment is arranged; verify a file can be added to the cart from the Files tab and the card offers no download control at all
- [x] 3.5 Handle a digital product in `app/pages/products/[slug].vue`: no image, the file name, format and size shown, the same delivery wording, and no file details on a physical product; verify both kinds render, and check the card and detail surfaces against dark mode per the layout's `bg-surface-0 dark:bg-surface-900` convention
- [x] 3.6 State on `app/pages/order-received.vue` that the file will be emailed once payment is arranged, only when the order contained a file line; verify the wording appears after a file order and not after a physical one
- [x] 3.7 Cap a file at one in `app/stores/cart.ts` and `app/pages/cart.vue`: adding a file already in the cart leaves the quantity at one, and a file line renders a fixed quantity with only the remove control, while physical lines keep their quantity control; verify by adding the same file twice and watching the header count and subtotal stay put

## 4. Verification

- [x] 4.1 Order a cart mixing a file and a physical product end to end against the real database, and verify one order is recorded with both lines, the total is the server-priced sum, and the staff mail marks the file line and names the file
- [x] 4.2 Re-run the seven-case `create_order` regression suite recorded in `handoff.md` section 10 against the changed function, and verify `empty_order`, `invalid_item` and `unavailable_item` still behave as specified
- [x] 4.3 Verify a digital row is never marked unavailable in the cart and never blocks checkout, leaving the out-of-stock behaviour for physical products unchanged
- [x] 4.4 Verify the cap end to end: the storefront cannot produce a file line above one, and a hand-rolled POST to `/api/orders` carrying one is rejected with no order recorded

## 5. Documentation

- [x] 5.1 Update `handoff.md`: the Files tab is no longer a mock in section 10, the schema gains a product kind in sections 4 and 5, and the deferred automated delivery belongs in section 10 as the next step; verify the document no longer calls the Files tab hardcoded
