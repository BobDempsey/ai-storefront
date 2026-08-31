## Why

A product that goes out of stock while it sits in a customer's cart creates a
dead end. The cart page removes only lines whose product has been *deleted*
(`missing[]` from `/api/cart/preview`); an out-of-stock line stays, is silently
excluded from the subtotal, and is still submitted at checkout — where
`create_order` raises `unavailable_item` and the customer gets a 409 error with
no explanation of which item is at fault and no offered way to clear it. The
only escape is for the customer to work out on their own which line to remove.

Since staff manage `in_stock` by hand in the Supabase dashboard, a line going
unavailable mid-session is an ordinary occurrence, not an edge case, and it
currently loses the order.

## What Changes

- An unavailable line stays visible in the cart, clearly marked, and is never
  removed on the customer's behalf. Silently dropping something they chose is
  worse than showing it, and the customer may want the product page or a note
  to staff.
- Checkout is blocked while the cart holds an unavailable line: the cart page's
  "Continue to checkout" action is disabled and accompanied by a message naming
  what must be removed and offering a control that removes it.
- The checkout page applies the same rule, so a customer who arrives there by
  URL or whose cart went stale on the page cannot submit an unavailable line.
- The subtotal continues to exclude unavailable lines, but the exclusion is
  labelled rather than silent, so the total never looks wrong.
- `POST /api/orders` keeps rejecting unavailable lines and its 409 is made
  actionable: the response identifies the offending products so the client can
  mark them, and the cart is re-checked rather than leaving the customer on a
  bare error. `create_order` stays the authority on availability.

### Non-goals

- **No stock decrementing or reservation.** `in_stock` remains a manual boolean
  set by staff; placing an order still does not change it. Two customers can
  order the last item, exactly as today.
- **No back-in-stock notifications, waitlists or "notify me" capture.**
- **No partial-order flow** — the customer is not offered "order the rest
  without this item" as an automated action; they remove the line themselves.
- **No change to how staff mark stock.** Supabase dashboard, per the phase-1
  admin decision.
- **No Supabase schema or RLS change**, and no change to `create_order`'s
  behaviour or its error names. This change touches the storefront and the
  orders route only.

## Capabilities

### New Capabilities

- `ordering/cart-availability`: how the storefront surfaces a cart line whose
  product is no longer purchasable — deleted or out of stock — and how it
  prevents an order containing one from being submitted.

### Modified Capabilities

None. No existing spec covers cart or checkout behaviour; `theming/color-mode`
is unaffected.

## Impact

- `app/pages/cart.vue` — mark unavailable lines, block the checkout action,
  offer removal; keep auto-removing only deleted products.
- `app/pages/checkout.vue` — refuse submission while an unavailable line is
  present; surface a 409 against the named lines.
- `server/api/orders.post.ts` — include the offending product ids in the 409
  response body.
- `server/api/cart/preview.post.ts` — already returns `in_stock` per line and
  `missing[]`; no contract change expected, but it is the source both pages
  read.
- `app/types/index.ts` — `CartPreview` may gain the 409 payload shape.
- No database migration. No new environment variable. No new dependency.
