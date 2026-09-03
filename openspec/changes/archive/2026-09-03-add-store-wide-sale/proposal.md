## Why

The storefront has no way to run a promotion. Staff want to discount the whole
catalogue for a period (a seasonal sale) without editing every product's
price by hand and without a payments/coupon system, which is out of scope.

## What Changes

- Add a `store_settings` table (single row) holding `sale_active boolean` and
  `sale_percent numeric`, editable by staff through the Supabase dashboard —
  consistent with the phase-1 decision that the dashboard is the admin UI.
- Expose the current sale state to the browser through a new public,
  read-only endpoint (`GET /api/store-settings`, RLS-readable like
  `products`), so the storefront can show sale pricing before an order is
  placed.
- Apply the discount server-side wherever a price reaches the customer:
  `/api/products`, `/api/products/[slug]`, `/api/cart/preview`, and
  `create_order` all compute the discounted price from `price_cents` and the
  active sale, rounding the same way. `create_order` remains the single
  source of truth for what is actually charged; the other three exist only
  so the UI can show the same number before checkout.
- Update the UI (product cards, product detail, cart, checkout summary) to
  show the discounted price with the original struck through and a "N% off"
  badge whenever the sale is active. No sale means no visual change.
- **BREAKING**: the shape of `/api/products`, `/api/products/[slug]`, and
  `/api/cart/preview` responses gains sale fields (additive, not a removal),
  and the assistant's catalogue tools (`server/utils/assistant.ts`) start
  seeing discounted prices — flagging here because those tools are a spec
  boundary (`specs/assistant/shopping-assistant/`), not because it removes
  anything.

This touches **Supabase schema** (`store_settings` table, RLS policy, and a
change to `create_order`).

## Capabilities

### New Capabilities

- `catalog/storefront-sale`: a store-wide, percentage-off sale that staff
  toggle and set through the database, applied consistently everywhere a
  price is shown or charged.

### Modified Capabilities

(none — `ordering/cart-availability` and `ordering/failure-reporting` keep
their existing requirements; `create_order`'s pricing behavior changes
internally but "server computes the price, client never does" is not a new
requirement, it is the existing one in `specs/ordering/` still holding)

## Non-goals

- No per-product or per-category sales — one percentage, storefront-wide.
- No scheduling (start/end dates) — staff flip the boolean by hand.
- No coupon codes or customer-entered discounts.
- No admin UI page — the Supabase dashboard is still the only admin surface,
  per the phase-1 decision.
- No change to the assistant's tool permissions — it already reads prices
  through the catalogue tools this change updates; it gains no new tool.

## Impact

- **Schema**: new `store_settings` table + RLS policy in `supabase/schema.sql`;
  `create_order` function body changes to read it and discount each line.
- **Server**: `server/api/products.get.ts`, `server/api/products/[slug].get.ts`,
  `server/api/cart/preview.post.ts` gain sale-aware pricing; new
  `server/api/store-settings.get.ts`; a shared pricing helper (likely
  `server/utils/pricing.ts`) so the rounding rule lives in one place.
- **App**: `app/pages/index.vue`, `app/pages/products/[slug].vue`,
  `app/pages/cart.vue`, `app/pages/checkout.vue`, and `app/types/index.ts`
  (new sale fields on the product/cart types).
- **Assistant**: `server/utils/assistant.ts` catalogue tools pick up
  discounted prices automatically through the same product-fetching code
  path; no tool signature changes.
