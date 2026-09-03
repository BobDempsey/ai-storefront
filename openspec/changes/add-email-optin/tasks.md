## 1. Database

- [x] 1.1 Add `public.email_subscribers` (`id uuid pk default gen_random_uuid()`,
      `email text not null unique`, `created_at timestamptz not null default
      now()`) to `supabase/schema.sql`, enable RLS, add no public policy —
      verify by re-running the file against a fresh database and confirming
      the table exists with RLS enabled and zero policies
- [x] 1.2 Apply the same change to the live Supabase project via the MCP
      server's `apply_migration` — verify by querying
      `information_schema.tables` for `email_subscribers`

## 2. Server

- [x] 2.1 Add `emailOptinSchema` (`email: z.string().trim().email().max(200)`)
      to `server/utils/schemas.ts` — verify with a unit test that a valid
      address parses and an invalid one fails
- [x] 2.2 Add `sendWelcomeEmail(email: string)` to `server/utils/email.ts`,
      reusing the file's existing `esc` helper, reading the promo code from
      a new `NEWSLETTER_PROMO_CODE` runtime config value — verify by sending
      a test email via Resend's sandbox/test mode and confirming the code
      appears in the body
- [x] 2.3 Add `NEWSLETTER_PROMO_CODE` to `.env.example` and to
      `nuxt.config.ts` runtime config — verify `useRuntimeConfig()` exposes
      it server-side only
- [x] 2.4 Create `server/api/email-optin.post.ts`: rate-limit on
      `email-optin:<ip>` (reuse `rate-limit.ts`, mirroring contact's limit
      shape), validate with `emailOptinSchema`, `insert ... on conflict
      (email) do nothing` into `email_subscribers`, send the welcome email
      only when a row was actually inserted, return the same `{ subscribed:
      true }` shape whether or not the address was new — verify with
      integration tests covering: new address (row inserted, email sent),
      duplicate address (no row, no email, same response), invalid address
      (400, no DB or email call), and rate-limit exceeded (429)
- [x] 2.5 On a real insert failure (not a conflict), return an error the
      visitor sees, and log the underlying detail server-side, matching the
      `failure-reporting` capability's rule that internal detail never
      reaches the client — verify by forcing a DB error in a test and
      asserting the response body carries no internal detail

## 3. App

- [x] 3.1 Build an email opt-in form component (email input + submit,
      loading and success/error states) — verify it renders and a
      successful submit shows a confirmation message without navigating
- [x] 3.2 Place the form in `app/layouts/default.vue`'s footer, next to the
      existing text, so it's present on every page using the default layout
      — verify by checking the footer renders the form on at least two
      different routes
- [x] 3.3 Wire the component to `POST /api/email-optin` and surface the
      rejected/duplicate/rate-limited responses as user-facing messages —
      verify with a component test covering the success and error paths

## 4. Verification

- [x] 4.1 Run `openspec validate add-email-optin --strict` and confirm it
      passes
- [x] 4.2 Manual end-to-end check: submit a new address in a running dev
      instance, confirm the row appears in Supabase and the welcome email
      arrives with the configured promo code; resubmit the same address and
      confirm no second email arrives
