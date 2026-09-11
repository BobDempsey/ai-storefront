## Why

A customer submits an order and gets a page with an id on it, then nothing. The
only email the order produces goes to staff, so the buyer has no record of what
they asked for, no written statement of what they owe, and nothing in their
inbox to reply to while they wait for staff to arrange payment. Every adopter of
this template inherits that gap, which is why it was prioritised ahead of the
work that is particular to this shop.

## What Changes

- A committed order sends a second email, to the customer's own address,
  confirming what they ordered and what it costs.
- The confirmation states the order id, the line items as priced by
  `create_order`, and the total, taken from the same re-read of the committed
  order that already feeds the staff notification. A discounted order states its
  pre-discount total and the discount that applied, matching what staff see.
- The confirmation says plainly that this is an order request, that no payment
  has been taken, and that staff will reply to arrange it. It is the one place
  the buyer is told what happens next.
- An order containing a file says the file is emailed after payment is arranged.
  It carries no attachment and no download link, because neither exists.
- Replies go to the shop: the confirmation's reply-to is the staff address, the
  mirror of the staff notification's reply-to being the customer.
- A test order sends no confirmation, for the same reason it sends no staff
  notification.
- A failed confirmation is logged and nothing more. It cannot fail the order,
  and it cannot stop the staff notification from being sent.

No Supabase schema or RLS change. The order row already carries everything the
confirmation states, and nothing new is stored.

## Capabilities

### New Capabilities
- `ordering/customer-confirmation`: what the buyer is told by email once their
  order is committed, and the guarantee that telling them cannot affect whether
  the order exists or whether staff hear about it.

### Modified Capabilities

None. `ordering/order-notification` governs the staff email and the discount
record on the order; both are unchanged, and the new email reads that record
rather than altering it.

## Non-goals

- **No domain, SPF or DKIM.** The Resend sandbox sender delivers only to the
  account address, so a confirmation to an arbitrary buyer will not arrive until
  a domain is verified. That is a per-deployment setup step, already recorded as
  such, and this change does not attempt it. It does mean end-to-end delivery
  can only be proven by placing an order as the account address.
- **No file delivery.** Emailing the file, a storage bucket and a time-limited
  link are the separate piece of work already recorded as outstanding.
- **No order-status page or customer-facing order lookup.** There are no
  accounts, and adding a link a stranger could guess is a bigger decision than
  this change.
- **No retry or queue for a failed send.** The order is the record; a bounced
  confirmation is not worth machinery a low-traffic shop will never exercise.
- **No customer-facing copy about payment methods.** Staff arrange payment
  off-app and the confirmation says so without naming how.

## Impact

- `server/utils/email.ts` — a second render and send alongside `sendOrderEmail`,
  reusing `esc`, `escMultiline` and the existing money formatting.
- `server/api/orders.post.ts` — sends the confirmation from the data it already
  reads back, in the same guarded block that sends the staff notification.
- `tests/unit/` — rendering and suppression rules, which need no network.
- `tests/db/orders-api.test.ts` — that a test order still sends nothing.
- No new environment variable, no new dependency, no migration.
