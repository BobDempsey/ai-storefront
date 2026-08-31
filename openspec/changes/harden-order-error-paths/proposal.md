## Why

Two error paths in the order flow report failure badly, and one comment
describes the code incorrectly.

`server/api/cart/preview.post.ts` puts Postgres's own `error.message` into the
502 it returns, so a database fault reaches the browser as internal detail —
table names, column names, or whatever the driver produced. Every other route
in the app returns a generic sentence and logs the detail; this one is the
outlier, and it is on an unauthenticated public endpoint.

`server/api/orders.post.ts` falls back to `totalCents: 0` when the post-insert
re-read fails, so the response asserts a total of zero that the server never
actually read. The staff email already handles this honestly — it carries an
`incomplete` warning banner — while the customer-facing response quietly states
a wrong number. Nothing renders that value today (the confirmation page shows
only the order reference), so this is a latent contract bug rather than a
visible `$0.00`, and it should be fixed before anything starts displaying it.

`server/utils/rate-limit.ts` documents itself as a fixed-window limiter. It
filters by elapsed time on every call, which is a sliding window; the two
behave differently at window boundaries, and the wrong word is exactly the kind
of thing the next reader will trust.

## What Changes

- `/api/cart/preview` returns a generic failure message when the catalogue
  query fails, and logs the underlying error server-side, matching the other
  routes.
- `/api/orders` no longer reports a total it could not read. The response
  distinguishes "the total is X" from "the order is committed but its total
  could not be read", and the order id — the thing that matters — is returned
  either way.
- The confirmation page continues to show the reference, and must not present
  an unread total as if it were real.
- `rate-limit.ts`'s docstring is corrected to say sliding window, along with
  the matching wording in `handoff.md` section 4.

### Non-goals

- **No change to when errors occur**, only to what is said about them. The
  re-read is not made more reliable, retried, or moved inside the transaction.
- **No new error-reporting infrastructure** — no Sentry, no structured logger,
  no error codes taxonomy. `console.error` remains the mechanism.
- **No change to the rate limiter's behaviour.** Whether a sliding window is
  the right choice is a separate question; this change only corrects the
  description.
- **No change to the staff email**, which already reports an incomplete re-read.
- **No Supabase schema or RLS change**, no migration, no new env var.

## Capabilities

### New Capabilities

- `ordering/failure-reporting`: what the storefront and its order APIs are
  allowed to say when something fails — what reaches the customer, what stays
  in the server log, and what the API may assert about an order it could not
  fully read.

### Modified Capabilities

None. `ordering/cart-availability` is unaffected: the 409 path and its
`unavailableProductIds` payload are unchanged.

## Impact

- `server/api/cart/preview.post.ts` — generic 502 message, log the detail.
- `server/api/orders.post.ts` — stop defaulting an unread total to zero.
- `app/types/index.ts` — the order response shape if it is typed there.
- `app/pages/order-received.vue` — unchanged unless it starts reading a total.
- `server/utils/rate-limit.ts` — docstring wording only.
- `handoff.md` — section 4 wording, and the section 9 entries these fix.
