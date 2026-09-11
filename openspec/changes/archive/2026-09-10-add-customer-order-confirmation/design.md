## Context

See proposal.md for motivation.

What already exists shapes almost all of this. `server/api/orders.post.ts` calls
`create_order`, then re-reads the committed order and its items to build the
staff notification, then sends that notification inside a `try`/`catch` whose
whole purpose is that nothing about email can fail a committed order. The
re-read already produces exactly the figures a buyer confirmation needs: the
priced lines, the total, and the four discount columns. `server/utils/email.ts`
already holds the escaping helpers, the money formatter and the Resend client
setup, and already sends to a customer address in `sendWelcomeEmail`.

Two constraints come from outside the code. The Resend sandbox sender delivers
only to the Resend account address until a domain is verified, so a confirmation
to a real buyer will not arrive on this deployment; the account address is the
only address that can prove the path end to end. And the repository is a
template, so the confirmation's copy has to read correctly for a shop that is
not this one, without a store name that has been configured.

## Goals / Non-Goals

**Goals:**

- Reuse the existing re-read rather than querying the order a second time. The
  buyer and staff must never be told two different totals for one order.
- Keep the guarantee that email cannot affect the order, and extend it: neither
  email can affect the other.
- Add no environment variable, no dependency and no migration, so an adopter of
  the template inherits this working with the configuration they already have.

**Non-Goals:**

- A shared template engine or component system for the two emails. See the
  decision below.
- Plain-text alternative parts. Neither existing email has one.

## Decisions

**Send both emails from the same guarded block, independently.** The
confirmation is sent from `orders.post.ts` beside `sendOrderEmail`, not from
inside it. Two sends, each in its own `try`/`catch`, so a throw from one cannot
skip the other. `Promise.allSettled` over the pair would also work and would
save a few hundred milliseconds, but it makes the failure handling harder to
read for no benefit a low-traffic shop will notice; two sequential awaits, each
guarded, is the version someone can check by eye. The staff notification goes
first: if the process dies between them, the shop still learns it has an order.

**Alternative rejected: a `sendOrderEmails` wrapper that sends both.** It reads
tidily and hides the ordering decision above, which is the one thing about this
worth seeing at the call site.

**No confirmation when the re-read failed.** The spec requires this, and the
reason is worth recording: the staff notification handles a failed re-read by
sending anyway with a warning banner, because staff have a dashboard and can go
look. A buyer has neither. Sending them a `$0.00` order with no line items is
worse than sending nothing, and the order id they already have on the
order-received page is enough for staff to find it. So `incomplete` suppresses
the confirmation entirely rather than adding a banner to it.

**Duplicate the HTML rather than share a renderer.** `renderHtml` is built for a
reader who can act on the order: it names the file staff owe, flags an
unreadable re-read, and tells them to reply to the customer. The confirmation
addresses someone who wants to know what they asked for and what happens next.
Parameterising one function into both would mean a flag per difference, and the
two would drift into a single template nobody can read. A second
`renderCustomerHtml` alongside it, sharing `esc`, `escMultiline` and `money`, is
more lines and less coupling. The line-item table markup is the part that
repeats; if a third email ever needs it, extract it then.

**Reply-to is the staff address, and the send is to the buyer.** The mirror of
the staff notification. `orderAdminEmail` is the only staff address the app
knows and is already what `/contact` delivers to.

**The subject and heading avoid the store name.** `NUXT_PUBLIC_STORE_NAME` is a
public runtime value available on the server, but it is the `Store` placeholder
on this deployment and in the template as shipped, and "Your order from Store"
reads as a bug. The subject states the order and its total, matching how the
staff subject is built.

**Suppression reuses `isTest`, not a new flag.** The same boolean that withholds
the staff notification withholds this one. A test order that emailed the address
in its fixture would put mail in a real inbox on every suite run.

## Risks / Trade-offs

- **The sandbox sender means this cannot be proven for a real buyer.** →
  Verify end to end by placing an order whose customer email is the Resend
  account address, which is deliverable. Everything except delivery to a third
  party is covered by unit tests over the renderer and the suppression rules.
  Record in handoff.md that a real buyer receives nothing until a domain is
  verified, so the next agent does not read silence as a bug in this change.
- **Two emails per order doubles what a burst of orders costs in Resend
  quota.** → The order route is rate limited to five per ten minutes per
  caller, and the free tier is far above that.
- **A buyer now receives mail at an address the shop never verified.** →
  Unchanged from the existing opt-in and contact paths, which already send to a
  submitted address. The order route validates the address with Zod before
  `create_order` sees it.
- **The two renderers can drift, and a discount shown differently in each is
  exactly the kind of drift that matters.** → Unit tests assert the same three
  figures from one payload in both.

## Migration Plan

No migration. No schema change, no new environment variable, no data to
backfill. Deploying is a push; rolling back is reverting the commit, and an
order placed in between is unaffected because nothing about it was stored
differently.

## Open Questions

- Whether the confirmation should quote the buyer's own notes back to them.
  Staff see them; the buyer typed them. Leaving them out is the smaller email
  and the safer default, and adding them later changes no requirement in the
  spec.
