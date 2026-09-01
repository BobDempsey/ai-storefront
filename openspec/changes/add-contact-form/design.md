## Context

See proposal.md — Why. What already exists and shapes the approach:

- `server/utils/rate-limit.ts` takes an arbitrary key, so two routes can hold
  separate buckets by prefixing the key. `orders.post.ts` passes the bare IP.
- `server/utils/schemas.ts` holds the Zod schemas; `server/utils/email.ts` holds
  `esc()`, `escMultiline()` and the Resend send, and already logs rather than
  throws on a failed send because an order is committed before it is emailed.
- `nuxt.config.ts` exposes `public.contactEmail` purely so the layout can build
  a mailto link, and `orderAdminEmail` privately for the order notification.
- `app/pages/checkout.vue` is the closest sibling for a form page: PrimeVue
  inputs, a `submitting` ref, a `Message` for errors, `error.data.statusMessage`
  for the text.

## Goals / Non-Goals

**Goals:**

- Reuse the order path's boundary pattern rather than parallel it: same
  validation location, same escaping helpers, same limiter.
- Make the success report honest — the sender is told it sent only if it did.

**Non-Goals:**

- Persistence, captcha, auto-reply, attachments — see proposal.md Non-goals.
- Extracting a shared "form page" component for two pages.

## Decisions

**Report the failure to the sender, unlike the order route.** `orders.post.ts`
swallows email errors because the order row is the record and the customer's
request genuinely succeeded. A contact message has no such record: if the send
fails and the page says "sent", the message is gone and nobody knows. So
`sendContactEmail` propagates failure and the route returns an error the page
surfaces. This is the deliberate difference between the two routes, and the
reason the spec words its success requirement the way it does.

**Separate rate-limit bucket, keyed `contact:<ip>`.** The limiter is a plain
Map keyed by string, so a prefix is all that is needed. A shared bucket would
let a burst of contact spam block the same visitor from ordering, which the
spec forbids. Limit: 3 per 10 minutes — a contact form is not a thing anyone
needs to submit repeatedly, and the order route's 5 per 10 minutes is the
precedent for the window.

**Deliver to `orderAdminEmail`, and drop `public.contactEmail`.** One staff
address for both notifications keeps configuration honest — a second variable
would silently diverge — and the public one exists only to build the mailto
link this change removes. Removing it from `public` is what satisfies the
spec's "not exposed to client-side code". Alternative considered: keep it as a
private `contactToEmail` for a different destination; rejected as unused
configuration, and easy to add later if staff ever split the inboxes.

**Reuse the escaping helpers rather than a template engine.** `esc()` and
`escMultiline()` already exist for exactly this text, and `escMultiline()`
turning newlines into `<br>` is what preserves the message's line breaks.

**Render success in place of the form.** The page swaps the form for a
confirmation once the send is acknowledged, which keeps the "sent" claim tied
to the response and avoids a resubmit on refresh. No redirect: there is no id
to carry, and `/contact` is a fine URL to sit on.

## Risks / Trade-offs

- **A message is lost if delivery fails** → The sender is told immediately and
  can retry or use another route; storage is the follow-up change that removes
  this risk properly.
- **The sandbox sender only delivers to the Resend account address** → Same
  constraint the order email already lives with; recorded in handoff section 6
  rather than worked around.
- **Rate limiting is per-instance and trusts `X-Forwarded-For`** → Inherited
  from the existing limiter and already an open item in handoff section 9; this
  change adds a second route behind the same caveat rather than a new problem.
- **No captcha means the form can be spammed within the limit** → Accepted for
  MVP traffic, consistent with the phase-1 decision for orders.

## Migration Plan

No migration and no new dependency. `NUXT_PUBLIC_CONTACT_EMAIL` stops being
read: `.env.example` loses it, and a deployment that still sets it is harmless.
Reversible by reverting the commit.
