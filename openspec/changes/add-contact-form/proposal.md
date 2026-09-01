## Why

The only way to reach the shop today is the navbar's mailto icon, which renders
`NUXT_PUBLIC_CONTACT_EMAIL` into the page. That publishes the address to every
scraper that reads the HTML, and it only works for a visitor whose browser has
a mail client wired up — on a phone with webmail, the link does nothing useful.
A visitor with a question about an order they have not placed yet has no other
route.

The order flow already has every piece a contact form needs: IP rate limiting,
Zod validation at the boundary, HTML escaping of customer text, and a Resend
send with `reply-to` set to the person who wrote in. This change reuses that
pattern rather than inventing a second one.

## What Changes

- A `/contact` page with name, email and message fields, submitting to a new
  `POST /api/contact`.
- The route rate-limits by IP, validates with Zod, escapes every interpolated
  value, and emails staff via Resend with `reply-to` set to the sender.
- The navbar's mailto icon becomes a link to `/contact`, and the shop's address
  is no longer rendered into any page.
- The sender sees a clear outcome: a confirmation when the message was sent,
  and an error inviting them to try again when it was not.

### Non-goals

- **Messages are not stored.** Email-only for this change, by decision: a
  Supabase table for contact messages is a follow-up. It follows that a failed
  send loses the message, which is why the sender is told when that happens —
  unlike an order, there is no committed row standing behind it.
- **No Supabase schema or RLS change**, no migration, no new table.
- **No captcha or Turnstile** — phase 2, as for orders. IP rate limiting covers
  MVP traffic, with the same `X-Forwarded-For` caveat recorded in handoff
  section 9.
- **No auto-reply to the sender**, and no ticketing, threading or inbox UI.
- **No file attachments.**
- **No change to the order flow or its email.**

## Capabilities

### New Capabilities

- `contact/contact-message`: how a visitor sends a message to the shop from the
  storefront, what the storefront does with it, and what the visitor is told
  about the outcome.

### Modified Capabilities

None. `ordering/failure-reporting` already governs what an error may say, and
this change follows it rather than altering it.

## Impact

- `app/pages/contact.vue` — new page.
- `app/layouts/default.vue` — the mailto icon becomes a `/contact` link.
- `server/api/contact.post.ts` — new route.
- `server/utils/schemas.ts` — a `contactSchema` alongside the order schemas.
- `server/utils/email.ts` — a `sendContactEmail` reusing the existing `esc()`
  and `escMultiline()` helpers.
- `nuxt.config.ts` — `public.contactEmail` is no longer needed for a mailto
  link; the address moves out of public runtime config.
- `.env.example`, `.env`, `handoff.md` — the contact address's role changes.
- No migration. No new dependency. Delivery uses the existing Resend key, so
  the sandbox-sender limit applies: staff mail reaches only the Resend account
  address until a domain is verified.
