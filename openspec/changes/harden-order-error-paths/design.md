## Context

See proposal.md — Why. Current state that shapes the approach:

- `server/api/cart/preview.post.ts` throws
  `createError({ statusCode: 502, statusMessage: error.message })` — the only
  route that forwards a database message. `products.get.ts`, `[slug].get.ts`
  and `orders.post.ts` all return a fixed sentence and `console.error` the
  detail.
- `server/api/orders.post.ts` re-reads the order and its items after the RPC
  commits, already sets an `incomplete` flag when either read fails, and passes
  that flag to the staff email. Its return statement is
  `{ orderId, totalCents: order?.total_cents ?? 0 }`.
- `app/pages/checkout.vue` destructures only `orderId` from that response, and
  `app/pages/order-received.vue` reads only the `id` query parameter. Nothing
  displays `totalCents` today.
- `server/utils/rate-limit.ts` keeps a timestamp array per key and filters it by
  `now - t < windowMs` on every call — a sliding window, described in its
  docstring as fixed.

## Goals / Non-Goals

**Goals:**

- Make "we could not read the total" representable in the response, rather than
  encoded as a zero that reads as a real amount.
- Bring the one leaking route in line with the convention the other three
  already follow.

**Non-Goals:**

- Changing failure rates, retry behaviour, or the transaction boundary.
- Introducing an error-code taxonomy or a logging library — see proposal.md
  Non-goals.

## Decisions

**Omit `totalCents` rather than sending `null` or a separate flag.** The
response becomes `{ orderId }` when the total could not be read and
`{ orderId, totalCents }` when it could, typed as an optional field. A consumer
that wants the number must check for it, which is exactly the property the
current zero destroys. Alternatives considered: `totalCents: null` — equivalent
in practice but invites `?? 0` at the call site, which is the bug being fixed;
a separate `incomplete: true` flag — more surface, and it invites reading a
total that is present but meaningless.

**Keep the request successful.** The order is committed, so a failed re-read is
a reporting problem, not an order problem; turning it into an error would tell
the customer their order failed when it did not. This preserves the behaviour
established when the email path was fixed.

**Have the confirmation page own the "no total" wording.** The page already
renders from the query string and shows no money at all today, so the spec's
requirement is satisfied by keeping it that way plus stating the amount is
confirmed by email. Passing the total through the URL is deliberately not
introduced: a query parameter the customer can edit is not a number worth
displaying.

**Log with the same shape as the existing handlers.** `console.error('[cart]
...', error)` mirrors `[orders]`, so the dev-server output stays greppable by
route.

## Risks / Trade-offs

- **A generic 502 makes diagnosing a live catalogue outage slower for whoever
  is looking at the browser** → The detail is in the server log, which is where
  the other three routes already put it; on Vercel or Netlify that is the
  function log.
- **An optional `totalCents` is a contract change for any consumer** → The only
  consumer is `checkout.vue`, which never read it. Recorded in handoff.md so
  the next reader knows the field is conditional.
- **Correcting the rate limiter's docstring documents behaviour nobody chose**
  → Accepted deliberately: the wording is corrected here, and whether a sliding
  window is right stays open in handoff.md section 9 alongside the
  `X-Forwarded-For` issue.

## Migration Plan

None. No migration, no env var, no dependency, no schema or RLS change.
Reversible by reverting the commit.
