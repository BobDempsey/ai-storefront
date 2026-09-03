## 1. Schema (Supabase migration required)

- [x] 1.1 Add `store_settings` table to `supabase/schema.sql` (singleton row via
      a fixed-`id` check constraint, `sale_active boolean not null default false`,
      `sale_percent numeric not null default 0` with a check constraint
      `sale_percent > 0 and sale_percent <= 100` — or `sale_percent` nullable
      when `sale_active` is false, whichever keeps the default row valid) and
      verify the table exists via `select * from store_settings` after running
      the file
- [x] 1.2 Add an RLS policy making `store_settings` public-select, mirroring the
      `"products are public"` policy, and verify an anon-key read succeeds
      while an anon-key write is rejected
- [x] 1.3 Insert the default singleton row (`sale_active = false`) via the
      migration so a fresh project starts with the sale off, and verify a
      second run is a no-op (`on conflict do nothing` or equivalent)
- [x] 1.4 Rewrite `create_order`'s pricing expression to read `store_settings`
      once and discount each line's `unit_price_cents` when `sale_active`,
      using the round-half-up-on-integer-cents rule from design.md, and verify
      with a manual call: an order placed with the sale off records full
      price, one placed with the sale on at a known percentage records the
      expected discounted total
- [x] 1.5 Apply the migration to the live Supabase project via the MCP server
      (`AGENTS.md` - Database access) and verify `select * from store_settings`
      returns the default row against the real database

## 2. Shared pricing helper

- [x] 2.1 Add `server/utils/pricing.ts` exporting a function that takes
      `price_cents` and the current sale state and returns the discounted
      cents using the same round-half-up rule as `create_order`, and verify
      a unit-style manual check: a handful of price/percent pairs match hand-
      computed expected cents
- [x] 2.2 Add a `server/utils/store-settings.ts` (or extend `server/utils/supabase.ts`)
      helper that fetches the singleton `store_settings` row, and verify it
      returns `{ saleActive: false, salePercent: 0 }`-shaped data against the
      seeded default row

## 3. API routes

- [x] 3.1 Add `server/api/store-settings.get.ts` returning the current sale
      state, and verify `curl localhost:3000/api/store-settings` returns
      `{ saleActive, salePercent }`
- [x] 3.2 Update `server/api/products.get.ts` and
      `server/api/products/[slug].get.ts` to add `salePercent` and
      `originalPriceCents` fields alongside the existing price field (per
      design.md's additive response-shape decision), discounting via the
      pricing helper, and verify a request while the sale is on and while
      it is off both return the documented shape
- [x] 3.3 Update `server/api/cart/preview.post.ts` to discount each line and
      the subtotal the same way, and verify the previewed subtotal for a
      known cart matches hand-computed discounted totals
- [x] 3.4 Update `app/types/index.ts` (`Product`, `CartLine`, `CartPreview`) to
      carry the new sale fields, and verify `npm run build` (or the project's
      type-check command) passes
- [x] 3.5 Wire `server/utils/assistant.ts` through the same pricing helper:
      `present()`, `priceCart()` and `draft_order`'s line pricing all query
      `products` independently of the API routes above, so they need their
      own discount applied to stay consistent with the spec's "everywhere a
      price appears" requirement, and verify a chat request while the sale is
      active reports the discounted price for a known item

## 4. Storefront UI

- [x] 4.1 Update product and file listing cards (`app/pages/index.vue`) to show
      the struck-through original price, discounted price and "N% off" badge
      when `salePercent > 0`, and verify visually with the sale on and off
- [x] 4.2 Update `app/pages/products/[slug].vue` the same way, and verify
      visually
- [x] 4.3 Update `app/pages/cart.vue` line items and subtotal, and verify the
      displayed subtotal matches `/api/cart/preview`'s discounted subtotal
- [x] 4.4 Update `app/pages/checkout.vue`'s order summary the same way, and
      verify the total shown before submit matches the `totalCents` the
      order confirmation reports after submit
- [x] 4.5 Confirm dark mode renders the sale badge and struck-through price
      correctly (per the `bg-white`/`dark:` gotcha in handoff.md section 8)

## 5. Verification

- [x] 5.1 Run a manual end-to-end pass: turn the sale on via the Supabase
      dashboard, place an order, confirm the emailed staff notification and
      the recorded order total both reflect the discounted price, then turn
      the sale off and confirm a new order reverts to full price
- [x] 5.2 Confirm the shopping assistant (`server/utils/assistant.ts`) reports
      discounted prices when asked about an item while the sale is active,
      since it reads the same product-fetching path (per proposal.md - Impact)
- [x] 5.3 Update `handoff.md` with the new `store_settings` table, the sale
      capability, and how staff turn a sale on (dashboard, two fields)
