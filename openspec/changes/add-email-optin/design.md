## Context

See proposal.md - Why. The contact route (`server/api/contact.post.ts`,
`server/utils/schemas.ts`, `server/utils/email.ts`, `server/utils/rate-limit.ts`)
is the closest existing pattern: an unauthenticated Zod-validated POST route,
rate-limited per origin, that sends mail through Resend. The opt-in route
reuses that shape but adds persistence, which contact deliberately has none of.

## Goals / Non-Goals

**Goals:**
- Reuse the existing validate → rate-limit → act pipeline rather than inventing
  a new request-handling shape.
- Make a duplicate submission indistinguishable, in the response, from a first
  submission (see spec - "An address can only subscribe once").

**Non-Goals:**
- Not designing a promo-code redemption path, a code-generation scheme, or an
  unsubscribe page - see proposal.md - Non-goals.

## Decisions

**New table `public.email_subscribers`, RLS enabled, no public policy.**
Mirrors `orders`: the browser has no direct read or write access; only the
Nitro server's service-role key reaches it. Columns: `id uuid primary key
default gen_random_uuid()`, `email text not null unique`, `created_at
timestamptz not null default now()`. The unique constraint is what makes "an
address can only subscribe once" enforceable at the database level rather
than only in application logic (closes a race between two concurrent
submissions of the same address, which a check-then-insert in server code
alone would not).

Alternative considered: reuse `orders.customer_email` to derive a mailing
list instead of a dedicated table. Rejected — opting in and placing an order
are different actions with different consent, and not every subscriber
places an order.

**Duplicate handling via `insert ... on conflict (email) do nothing`,
inspecting the row count.** The route inserts and checks whether a row was
actually written. Zero rows written means the address already existed: skip
the email send, return the same success shape as a first-time subscribe.
This is what makes the response identical for both cases per the spec
(response wording never reveals list membership) while still only sending
one welcome email per address ever.

**Promo code is a single static value from `.env`** (e.g.
`NEWSLETTER_PROMO_CODE`), read server-side and interpolated into the welcome
email template. No column for it on the subscriber row, no per-subscriber
generation. Simplest thing that satisfies "receive a promo code" without
building code generation, expiry, or redemption tracking that nothing else
in the app (checkout, pricing) currently supports.

**New rate-limit bucket `email-optin:<ip>`,** independent of `contact:<ip>`
and the checkout bucket, same `rateLimit()` helper as contact. Same rationale
as contact's own bucket: opt-in spam must not spend the allowance another
route needs.

**New `sendWelcomeEmail` helper in `server/utils/email.ts`,** alongside
existing `sendContactEmail`. Reuses the existing `esc`/`escMultiline`
escaping helpers already in that file since the email address (though
validated) is still visitor-supplied text interpolated into HTML sent to
Resend.

## Risks / Trade-offs

- **Static promo code is not one-time-use per subscriber** → acceptable per
  proposal Non-goals; if abuse becomes a problem later, per-subscriber codes
  are a follow-up change, not a blocker here.
- **`on conflict do nothing` silently swallows a real insert failure that
  happens to look like a conflict** → the route distinguishes "0 rows, no
  error" (duplicate) from "insert threw" (real failure, e.g. connection
  issue), and only the latter surfaces as an error to the visitor.
- **Email address is the only PII collected here beyond what contact already
  collects** → stored the same way `orders.customer_email` already is
  (service-role-only table, RLS enabled), so this doesn't raise the bar
  already accepted elsewhere in the schema.
