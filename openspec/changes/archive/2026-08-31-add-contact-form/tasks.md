No task below needs a Supabase migration. No new environment variable is added;
one public variable (`NUXT_PUBLIC_CONTACT_EMAIL`) stops being used, and
delivery reuses the existing `NUXT_RESEND_API_KEY` and `NUXT_ORDER_ADMIN_EMAIL`.

## 1. Validation

- [x] 1.1 Add `contactSchema` to `server/utils/schemas.ts` — trimmed name (1–120), email (1–200), message (1–4000) — following the existing order schema's style; verify by submitting an empty message and an oversized message and seeing both rejected

## 2. Email

- [x] 2.1 Add `sendContactEmail` to `server/utils/email.ts` that renders the sender's name, email and message through `esc()` / `escMultiline()`, sets `replyTo` to the sender and subjects the mail so staff can tell it from an order; verify the delivered mail shows submitted markup as text and preserves line breaks
- [x] 2.2 Make it signal failure to its caller rather than only logging — a missing key or a rejected send must not look like success; verify by temporarily blanking the Resend key and confirming the route reports failure

## 3. Route

- [x] 3.1 Add `server/api/contact.post.ts`: rate limit on key `contact:<ip>` at 3 per 10 minutes, Zod-validate, send, and return a generic 502-style failure whose text carries no internal detail; verify a valid POST returns success and a fourth POST in the window returns 429
- [x] 3.2 Verify the contact limit and the order limit are independent by exhausting `contact:` and then placing an order successfully

## 4. Page and navigation

- [x] 4.1 Add `app/pages/contact.vue` with name, email and message fields, a submitting state, an error `Message` fed from `statusMessage`, and a confirmation that replaces the form on success; verify a real submission lands in the staff inbox and the page shows the confirmation
- [x] 4.2 Point the navbar control at `/contact` in `app/layouts/default.vue`, keeping an accessible label, and verify it renders in both colour schemes
- [x] 4.3 Remove `public.contactEmail` from `nuxt.config.ts` and `NUXT_PUBLIC_CONTACT_EMAIL` from `.env.example`; verify with a grep of the built client output (or the served HTML) that no staff address appears

## 5. Documentation

- [x] 5.1 Update `handoff.md`: the contact route in section 4's layout, the env table in section 6 (the public contact variable is gone), and note the second rate-limited public endpoint against the `X-Forwarded-For` caveat in section 9; verify the document no longer describes a mailto icon
