## Why

A discounted order arrives in the staff inbox with no sign of why it is
discounted. The email shows the priced lines and the total, so an order for a
$29 item reads as $21.75 with nothing saying where the other $7.25 went. Staff
reconciling that total against the catalogue have to guess whether a promo code
or the store-wide sale produced it, and the guess is unreliable: the sale
percentage is a mutable row, so by the time anyone looks it may no longer be
what priced the order.

Nothing on the committed order records which discount applied, either, so the
Supabase dashboard cannot answer the question a week later.

## What Changes

- **The committed order records the discount that priced it.** `create_order`
  writes the discount source, the percentage, the code as matched, and the
  pre-discount subtotal onto the order row inside the same transaction that
  prices the lines. A later edit to the sale row or the `promo_codes` table
  cannot rewrite what an order says it charged.
- **The staff email states the discount and names its source.** A discounted
  order shows a subtotal, a discount line reading either the promo code and its
  percentage or the store sale and its percentage, and the total. An
  undiscounted order looks exactly as it does today.
- **A promo code and a store sale are distinguishable in the email.** They are
  the same discount arithmetic today and read identically. Since `create_order`
  applies the better of the two and never both, the email names which one won.
- Values that reach the email pass through the existing `esc()` helper, as
  every other interpolated field already does.

**This change touches Supabase schema.** It adds four nullable columns to
`orders` and rewrites `create_order`'s body to populate them. It adds no table,
changes no RLS policy, and does not change `create_order`'s signature, so the
drop-then-replace dance the last signature change needed does not apply here.
Existing order rows keep null in the new columns, which reads as "written
before this change" rather than as a zero discount.

## Capabilities

### New Capabilities

- `ordering/order-notification`: What the staff order email states about how an
  order was priced, and the record on the committed order that the email is
  written from.

### Modified Capabilities

None. `promotions/promo-code` and `catalog/storefront-sale` describe how a
discount is chosen and applied, and neither changes here. Both live in changes
that are complete and committed but not archived
(`openspec/changes/add-promo-codes/`, `openspec/changes/add-store-wide-sale/`),
so archive them before this change is applied.

## Impact

- `supabase/schema.sql`: four `alter table ... add column if not exists`
  statements on `orders`, a coherence constraint across them, and a rewritten
  `create_order` body that sets them. Needs a migration against the live
  project.
- `server/api/orders.post.ts`: the post-insert re-read selects the new columns
  and passes them to the email.
- `server/utils/email.ts`: `OrderEmailPayload` gains the discount, and
  `renderHtml` grows the subtotal and discount rows.

## Non-goals

- **No customer-facing confirmation email.** The shop still notifies staff
  only, and that stays out of scope.
- **No change to how a discount is chosen.** The better of the sale and the
  code, never both, exactly as today.
- **No backfill of existing orders.** Their discount is not recoverable, and
  inventing one would be worse than leaving it null.
- **No per-line discount detail.** One discount applies to the whole order, so
  the email states it once rather than per line.
- **No admin screen for reading discounts back.** The Supabase dashboard shows
  the new columns, matching the existing decision.
