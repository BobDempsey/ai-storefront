## Context

See proposal.md - Why. Pricing today has one source of truth: `products.price_cents`,
read once by `create_order` at order time (`supabase/schema.sql`). `/api/products`,
`/api/products/[slug]`, and `/api/cart/preview` each independently re-fetch
prices from `products` for display. There is no settings/config table anywhere
in the schema yet, and no server route reads anything but `products` and
`orders`/`order_items`.

## Goals / Non-Goals

**Goals:**
- One place in the database that holds the sale state, readable by the
  browser the same way `products` already is.
- One rounding rule for "price minus percent", used identically by every
  route and by `create_order`, so the price a buyer is shown is always the
  price they are charged.

**Non-Goals:**
- Caching or realtime push of sale state changes to an open tab (see Risks).
- A generic discount/coupon engine — this is one boolean and one number.

## Decisions

**A `store_settings` singleton table, not a config row bolted onto `products`
or a KV table.** A dedicated table with a single row (`id` fixed to a known
constant, enforced by a check constraint) is the smallest structure that (a)
Postgres RLS can expose read-only to `anon` the same way `products` already
is, and (b) `create_order` can join or `select` from directly rather than
parsing a JSON blob. Alternative considered: a generic `settings(key, value)`
table. Rejected — this project has exactly one setting; a generic table adds
indirection with no other value in phase 1.

**The discount is computed by one SQL function, `public.sale_price(price_cents)`,
called from `create_order` and from every read route.** Both the Postgres
functions and the four TypeScript/Nitro call sites need the same rounding
rule. Doing the arithmetic in SQL and calling it everywhere — including from
the Nitro routes via a `select public.sale_price($1)` round-trip, or by
fetching `store_settings` once per request and mirroring the same rounding
(`round(price_cents * (100 - sale_percent) / 100)`, banker's-rounding-free
integer cents) in a single shared `server/utils/pricing.ts` helper — removes
the two-implementations-of-the-same-math risk called out in the proposal.
Chosen approach: a shared `server/utils/pricing.ts` function used by all four
Nitro routes, plus the equivalent expression inlined in `create_order`,
because a round-trip SQL call per product on a list page is needless latency
for arithmetic this simple; both implementations use the same
round-half-up-on-integer-cents rule and are covered by the same regression
suite entry. Alternative considered: compute discounts only in `create_order`
and have the display routes call it too. Rejected — `create_order` only runs
at submission time and has side effects (it writes an order); display needs a
read-only path.

**RLS: `store_settings` is public-select, like `products`.** No public write,
consistent with every other table. Staff edit it through the Supabase
dashboard, per the existing "dashboard is the admin UI" decision.

**Response shape: every price-bearing API response adds `salePercent` (0 when
inactive) and `originalPriceCents` alongside the existing price field, rather
than replacing the price field with a discounted one.** This keeps existing
consumers (the assistant's catalogue tools) working unchanged — they read the
same field they always did, now already discounted — while letting the UI
render the struck-through original without a second request. `originalPriceCents`
is omitted (or equal to the price field) when no sale is active, so a
consumer that ignores the new fields sees no behavior change.

## Risks / Trade-offs

- **A buyer's already-open tab does not learn a sale just started or ended.**
  → Accepted for phase 1: the next navigation or cart preview re-fetches and
  picks it up, same as a price change to any single product today. No
  realtime subscription is added.
- **Two implementations of the same rounding rule (SQL and TypeScript) can
  drift.** → Both round integer cents with the same half-up rule on
  `price_cents * (100 - sale_percent) / 100`; the `create_order` regression
  suite (referenced in handoff.md section 10) gets a sale-active case that
  asserts the charged total against the same helper's output, so a future
  edit to one side without the other fails that check.
- **A sale percentage of exactly 100 makes every item free.** → Allowed by
  the spec (`<= 100`) since nothing here handles payment anyway; staff
  setting it is a deliberate, dashboard-level action, not a bug to guard
  against in phase 1.

## Migration Plan

Additive only: a new table, a new RLS policy, and an `alter`-free rewrite of
`create_order`'s pricing expression (same function signature, same error
contract). Existing rows and callers are unaffected when `store_settings` has
its default row (`sale_active = false`). Run via the Supabase MCP server or
the SQL editor, same as prior schema changes (`AGENTS.md` - Database access).
No rollback beyond dropping the table and reverting the function body, since
nothing depends on `store_settings` existing when `sale_active` is false.
