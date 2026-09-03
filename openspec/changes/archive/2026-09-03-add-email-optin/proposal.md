## Why

The storefront has no way to capture a visitor's interest when they are not
ready to order. Contact messages exist for one-off questions, but there is no
low-friction path for a visitor to say "tell me what's next" and get an
immediate reason to come back. An email opt-in with a welcome promo code gives
staff a mailing list and gives the visitor an incentive to hand over their
address.

## What Changes

- Add an email opt-in form, reachable from the site chrome on every page that
  uses the default layout (mirroring how contact is reachable today).
- A visitor submits just an email address; the storefront validates it,
  rejects an address already subscribed, and confirms success without
  revealing whether an address was already on the list.
- On a new subscription, the storefront sends the visitor a welcome email
  (via Resend) containing a promo code. The code is a single static value
  read from configuration, the same code for every subscriber — not a
  per-subscriber generated code, and not wired into checkout or order
  pricing in this change.
- Subscriptions are persisted in Supabase so staff can see who opted in and
  the list survives beyond a single email send.
- The opt-in route is rate-limited per origin, in its own bucket, the same
  pattern the contact route uses.

## Capabilities

### New Capabilities
- `newsletter/email-optin`: lets a visitor submit an email address to join a
  mailing list and receive a one-time welcome promo code by email.

### Modified Capabilities
(none — no existing capability's requirements change)

## Non-goals

- No promo code redemption at checkout or in order pricing. The code is
  handed out by email only; applying it to an order is a separate future
  change.
- No per-subscriber unique codes, expiry, or usage tracking in this change.
- No unsubscribe flow beyond what the welcome email itself needs to be
  compliant (a working unsubscribe/contact link in the email is required;
  a self-service unsubscribe *page* is out of scope).
- No admin UI for browsing or exporting subscribers; that's a direct
  Supabase table read for now.
- No marketing/broadcast sending capability (e.g. "email all subscribers
  about a new product"). This change only covers capturing the opt-in and
  sending the one welcome email.

## Impact

- **Supabase schema**: adds a new `public.email_subscribers` table (email,
  unique constraint, created_at) with RLS enabled and no public policies —
  reachable only through the Nitro server's service-role key, matching how
  `orders` is handled today. Documented in `supabase/schema.sql`.
- **Server**: new `server/api/email-optin.post.ts` route, a new Zod schema in
  `server/utils/schemas.ts`, and a new `sendWelcomeEmail` (or similarly named)
  helper in `server/utils/email.ts`.
- **App**: a new opt-in form component, placed in the site chrome (footer,
  matching where a newsletter signup conventionally lives) so it appears on
  every page using the default layout.
- **Config**: a new `.env` entry for the static promo code, documented in
  `.env.example`.
- **Dependencies**: none new — reuses Resend and Supabase already in the
  stack.
