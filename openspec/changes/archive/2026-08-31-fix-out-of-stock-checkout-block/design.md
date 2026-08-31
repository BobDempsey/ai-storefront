## Context

See proposal.md — Why. The relevant current state:

- `POST /api/cart/preview` already returns everything needed: priced `lines`
  each carrying `in_stock`, a `subtotalCents` that already filters on
  `in_stock`, and `missing[]` for ids absent from the catalogue. No new endpoint
  or query is required to know what is unavailable.
- `app/pages/cart.vue` watches `preview` and removes `missing[]` ids from the
  Pinia store; nothing reacts to `in_stock` beyond a red "No longer available"
  line of text and the subtotal filter.
- `app/pages/checkout.vue` fetches the same preview to render its summary, then
  submits `cart.items` wholesale. It already renders `errorMessage` from
  `error.data.statusMessage` in a PrimeVue `Message`.
- `server/api/orders.post.ts` maps a `unavailable_item` error from
  `create_order` to a 409 whose `statusMessage` is a generic sentence. The RPC
  raises a bare `unavailable_item` with no payload, so the route does not today
  know *which* product failed.
- The cart store persists via the persistedstate Nuxt module's cookie default,
  so cart contents are present during SSR while the preview fetch is not; both
  pages already wrap cart-dependent UI in `ClientOnly`.

## Goals / Non-Goals

**Goals:**

- Derive availability in exactly one place per page from the preview response,
  so the cart page, the checkout page and the submit guard cannot disagree.
- Keep `create_order` the sole authority; the client-side block is a courtesy,
  not the enforcement.
- Make the 409 actionable without changing `create_order`'s contract.

**Non-Goals:**

- No reservation, stock decrementing, or optimistic locking (proposal —
  Non-goals). The race between pricing and submission is narrowed, never
  closed; the spec requires the server to win it.
- No new shared component library or composable extraction beyond what the two
  pages need — the storefront has no `app/composables/` today and this change
  does not create a pattern the rest of the app must follow.

## Decisions

**Compute unavailability on the client from the existing preview, rather than
adding a server field.** `preview.lines` already carries `in_stock`; an
`unavailableLines` computed on each page is enough. Alternative considered:
have `/api/cart/preview` return an `unavailable[]` array mirroring `missing[]`.
Rejected — it duplicates state already on the wire, and the pages need the line
objects (name, slug) anyway to name the products in the message.

**Identify the failing products in the 409 by re-querying, not by changing
`create_order`.** The RPC raises a bare `unavailable_item`, and teaching it to
return the offending ids would mean either an exception payload the client has
to parse out of a Postgres message or a change to its return type — both push
schema-level risk into a change the proposal scoped as storefront-only. Instead,
on `unavailable_item` the route re-selects the submitted ids from `products` and
puts the ids that are missing or out of stock into `data.unavailableProductIds`
on the 409. This costs one extra query on a path that is already an error, and
`create_order` keeps its contract and its transaction guarantee. Alternative
considered: have the client simply re-run `/api/cart/preview` after a 409 and
diff it. Rejected as it depends on the client to interpret an error correctly
and can disagree with what the server actually saw.

**Block by disabling the action and stating why, not by hiding it.** A disabled
"Continue to checkout" with an adjacent message naming the products satisfies
the spec's "told which product must be removed first"; hiding the control
leaves a customer with no explanation. The message and the per-line marking
carry the same product names.

**Guard checkout with the preview it already fetches.** `checkout.vue` submits
only when its own preview shows no unavailable line, and refreshes that preview
before submitting so a stale page cannot slip one through. On rejection it
refreshes again, which is what re-marks the line and re-enables the flow once
the customer removes it. The form state is plain `reactive` and is never reset,
satisfying the spec's requirement that typed details survive.

**Keep the auto-remove for `missing[]` exactly as it is.** Deleted products
have no page to link to and nothing to show, so removing them silently remains
right; the spec draws the line at out-of-stock.

## Risks / Trade-offs

- **Race between the last preview and submission** → Unclosable without
  reservation, which is a non-goal. Mitigated by refreshing the preview
  immediately before submit and by the server rejecting authoritatively; the
  409 path is specified to leave an actionable cart, so losing the race costs
  the customer one removal, not the order.
- **The extra query on the 409 path can itself fail, or can return a different
  answer than `create_order` saw** (stock flipped back in between) → The 409 is
  still returned with its generic message; `unavailableProductIds` is treated
  as best-effort by the client, which falls back to marking from its refreshed
  preview.
- **A customer who never removes the line is stuck by design** → Accepted; the
  cart page always offers removal on that line, and when every line is
  unavailable the message says so rather than showing an unexplained dead
  control.
- **Two pages implement the same rule** → Small duplication, deliberately
  preferred over introducing the project's first composable for two call sites;
  if a third appears, extract then.

## Migration Plan

None. No migration, no new environment variable, no dependency, no Supabase
schema or RLS change. The change is deployed with the app and is reversible by
reverting the commit; carts already in customers' cookies are unaffected, since
nothing about the stored shape (`productId`, `quantity`) changes.
