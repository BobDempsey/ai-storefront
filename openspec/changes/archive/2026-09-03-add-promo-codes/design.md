## Context

See `proposal.md` for motivation. The constraints that shape this design are
already in the codebase:

- `create_order` is the single source of truth for pricing. The browser sends
  product ids and quantities, never money. Any discount has to be resolved where
  the order is written, not before.
- `store_settings` already established the pattern for a staff-editable switch:
  one table, RLS on, read by the server with the service-role key, edited by
  hand in the Supabase dashboard.
- `server/utils/pricing.ts` and the SQL inside `create_order` deliberately hold
  the same rounding rule (round half up, on integer cents) in two languages,
  because the price shown ahead of checkout and the price charged must agree.
  A promo code adds a second percentage to that shared rule.
- The store-wide sale is currently active at 20% on the live project, so both
  the sale-on and sale-off paths are live paths from day one.
- There is no test framework in this repo. Verification is manual, against a
  running dev server and the live database, the way the sale and opt-in changes
  were verified.

## Goals / Non-Goals

**Goals:**

- A code cannot be redeemed twice by the same address, even under two
  simultaneous submissions.
- The discount a buyer is shown and the discount recorded come from one
  resolution rule, expressed once per language.
- Staff change codes in the dashboard, with no deploy and no restart.
- The assistant's inability to touch a code is structural, not a matter of it
  following an instruction.

**Non-Goals:**

- Defending against a buyer using a second email address. Without accounts,
  email is the only identity the shop has, and the shop accepts that.
- Any admin surface beyond the Supabase table editor.
- Reworking how the cart or the order path is structured.

## Decisions

### The code is resolved inside `create_order`, in the order's own transaction

The Nitro route passes the raw string the buyer typed. `create_order` looks the
code up, checks the redemption record, computes the percentage, prices the
lines, writes the order, and writes the redemption, all in one transaction.

Alternative considered: validate in `server/api/orders.post.ts`, then pass a
percentage into the function. Rejected on two counts. It moves the authority for
a price outside the database, which is exactly the property the project decided
to protect. And it opens a window between the check and the insert in which the
code can be deactivated or redeemed by a concurrent request, so two orders can
both pass a check that only one should.

Uniqueness is enforced by the database, not by a query: a unique index on
`(promo_code_id, email_normalized)` in `promo_redemptions`. Two concurrent
orders with the same code and address cannot both commit, whatever the timing.
The loser's whole transaction rolls back, so it leaves no half-order.

### The 2-argument `create_order` is dropped, not left alongside a 3-argument one

`create or replace function` matches on signature, so adding `p_promo_code`
creates a second function rather than replacing the first. Both would then be
callable, and the older one would silently ignore promo codes and keep its own
grants. The migration drops `create_order(jsonb, jsonb)` explicitly before
creating `create_order(jsonb, jsonb, text)`, and re-runs the `revoke execute`
lines against the new signature. The existing revokes do not carry over.

### Discount resolution is `greatest(sale_percent, promo_percent)`, applied once

Per the decision recorded with the user: a buyer gets the better of the two
offers, never both. One percentage is chosen per order, then applied to every
line with the existing rounding rule, so nothing about the per-line arithmetic
changes. A code is still recorded as redeemed when the sale beat it, because the
buyer did use it on an order.

Alternative considered: stacking the two multiplicatively. Rejected by the user:
it makes the final total depend on a sale percentage staff change casually, and
lets the combined discount exceed anything the shop advertised.

### A promo code has its own errors, distinguishable by the checkout page

`create_order` raises `unknown_promo_code`, `inactive_promo_code` and
`promo_code_used`. `server/api/orders.post.ts` maps each to a 400 carrying a
field marker, the way `unavailable_item` already becomes a 409 with
`data.unavailableProductIds`. The checkout page needs to distinguish them
because the remedy differs: a typo is worth retrying, an already-used code is
not.

### Codes and emails are normalised at the boundary of the database

Codes are stored and compared as `upper(trim(code))`, addresses as
`lower(trim(email))`, both enforced by unique indexes on the normalised form.
This is why "welcome25", " WELCOME25 " and "WELCOME25" are the same code without
the application doing anything, and why a redemption cannot be dodged by
capitalising an address differently. `email_subscribers` keeps its own plain
`unique(email)`; aligning it is out of scope here.

### `/api/cart/preview` gains an optional code; there is no separate check route

The checkout page has to show the discounted total before the buyer commits, and
`preview` is already the one endpoint that prices a cart for display. It takes
an optional `promoCode` and returns the priced lines plus a promo status of
`applied`, `unknown`, `inactive` or `used`. The cart page and the assistant call
it without a code and see exactly what they see today.

Alternative considered: a dedicated `POST /api/promo/check` returning a
percentage for the page to apply. Rejected because it hands a percentage to the
browser and invites the client to do the arithmetic, which is the thing the
project's pricing decision exists to prevent.

The preview result is advisory. `create_order` resolves the code again when the
order is placed, and its answer is the one that counts.

### `/api/store-settings` reports the active discount percentage, never the code

The opt-in copy has to name a percentage that tracks the active code, so that
figure has to reach the browser. The endpoint returns the active code's
percentage alongside the existing sale state. It does not return the code
itself, which is what keeps the offer honest without letting a visitor read a
discount they were never sent. `openspec/changes/add-promo-codes/specs/promotions/promo-code/spec.md`
carries this as a requirement rather than leaving it to review.

### The assistant gets a prompt rule and no tool, which is the actual control

The assistant's permissions have always been its tool list, and that stays the
control here: nothing in `server/utils/assistant.ts` reads, writes or resolves a
code, and the draft path passes no code to `create_order`. The system prompt
rule exists so the assistant explains the offer correctly and declines cleanly,
not to enforce anything. Verification is by inspecting the tool list and a draft
submission, not by asking the assistant to misbehave and seeing whether it
refuses.

### Subscribing is extracted into one shared helper

`server/api/email-optin.post.ts` currently holds the upsert-and-welcome logic
inline. It moves to `server/utils/subscribe.ts` so the contact and order routes
call the same code path. Both secondary callers wrap it in try/catch and log a
failure rather than surfacing it, because a failed subscription must never fail
the message or the order it rode in on.

## Risks / Trade-offs

- **Retiring `NUXT_NEWSLETTER_PROMO_CODE` breaks the welcome email if the
  database has no active code.** → The migration seeds `WELCOME25`, the value
  currently in `.env`, as the active code at 25%, so the switch is a no-op for
  anyone who already has that code. The env var is removed from `.env` and
  `.env.example` in the same change.
- **Dropping and recreating `create_order` is briefly destructive.** → An order
  submitted during the migration fails with a missing-function error. Traffic is
  effectively zero and the whole migration is one statement batch, so the window
  is milliseconds. No rollback is needed beyond re-running the previous
  definition, which stays in git history.
- **Email is a weak redemption key.** → A determined buyer reuses a code with a
  second address. Accepted: there are no accounts to key it on, and the loss is
  one extra discount rather than anything structural. Recorded as a known limit
  rather than solved.
- **Two rounding implementations can drift.** → The same risk the sale already
  carries, handled the same way: one documented rule, and a verification step
  that compares `create_order`'s recorded total against the previewed total on a
  real order, with the sale both on and off.
- **The percentage in the marketing copy is now data.** → Deactivating every
  code makes the invitation drop the discount sentence rather than promise
  nothing in particular. The spec requires that case explicitly because it is
  easy to leave rendering "undefined% off".
- **The live sale is on at 20% while this is built.** → Every price check has to
  state which sale state it ran under, or a discounted figure will be read as
  proof of the wrong thing.

## Migration Plan

1. Write the two tables, their indexes and RLS into `supabase/schema.sql`,
   alongside the rewritten `create_order`. The file must still stand up a fresh
   project and upgrade the existing one, as it does today.
2. Apply it to the live project with the Supabase MCP server's
   `apply_migration`, in one batch: create tables, seed `WELCOME25` at 25%
   active, drop `create_order(jsonb, jsonb)`, create the 3-argument version,
   re-run both revokes.
3. Verify against the live database before touching the UI: call `create_order`
   directly with no code, a valid code, an unknown code, an inactive code and a
   code already redeemed, with the sale both on and off. Confirm the
   better-of-two rule and that a refused call leaves no order and no redemption.
4. Ship the server routes, then the UI.
5. Remove `NUXT_NEWSLETTER_PROMO_CODE` from `.env` and `.env.example` last, once
   the welcome email reads the database, and restart the dev server: env changes
   are not hot-reloaded.

Rollback is the previous `create_order` definition from git plus leaving the two
new tables in place, which nothing else reads.

## Open Questions

- Whether `email_subscribers.email` should be normalised and re-indexed to match
  the redemption table's `lower(trim(...))` rule. It is a pre-existing
  inconsistency, not one this change introduces, and it can be fixed later
  without touching these specs.
- Whether a code should ever be shown on the order confirmation page or in the
  staff email. Neither spec requires it, and adding it later changes no
  behaviour defined here.
