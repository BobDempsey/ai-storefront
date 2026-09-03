## 1. Prerequisites

- [x] 1.1 Archive `add-email-optin` with `/opsx:archive` so `newsletter/email-optin` exists under `openspec/specs/`, and verify this change's delta for that capability now has a main spec to modify (`openspec validate add-promo-codes` reports no missing-capability error)
- [x] 1.2 Record the live sale state before any pricing check (`select sale_active, sale_percent from store_settings`) and note it, so later price verifications say which state they ran under. **Recorded 2026-09-03: `sale_active = true`, `sale_percent = 20`.** Restore this in task 6.6

## 2. Database (migration required, touches schema and RLS)

- [x] 2.1 Add `promo_codes` to `supabase/schema.sql` (id, code text, percent numeric, active boolean, created_at) with a unique index on `upper(trim(code))` and a percent range check mirroring `store_settings_sale_percent_range`; verify a duplicate code in differing case is rejected
- [x] 2.2 Add `promo_redemptions` (id, promo_code_id fk, email text, order_id fk, created_at) with a unique index on `(promo_code_id, lower(trim(email)))`; verify a second insert for the same pair fails
- [x] 2.3 Enable RLS on both tables with zero policies, matching `email_subscribers`; verify a `select` through the publishable key returns nothing while the service-role key reads normally
- [x] 2.4 Seed `WELCOME25` at 25 percent active, the value currently in `.env`; verify one row exists and is active
- [x] 2.5 Rewrite `create_order` as `create_order(jsonb, jsonb, text)`: resolve the code, raise `unknown_promo_code` / `inactive_promo_code` / `promo_code_used`, price every line at `greatest(sale_percent, promo_percent)` using the existing round-half-up rule, and insert the redemption row in the same transaction; verify the file still stands up a fresh project
- [x] 2.6 Drop `create_order(jsonb, jsonb)` explicitly and re-run both `revoke execute` statements against the new 3-argument signature; verify only one `create_order` remains and that `anon` cannot execute it
- [x] 2.7 Apply the whole batch to the live project with `apply_migration`; verify `list_tables` shows both new tables and the seeded code is present

## 3. Verify pricing at the database before any UI

- [x] 3.1 Call `create_order` directly with no code, sale off; verify the recorded total is full price
- [x] 3.2 Call it with `WELCOME25`, sale off; verify the total is 25 percent off, matching hand computation, and a redemption row was written
- [x] 3.3 Call it with `WELCOME25` again from the same address; verify it raises `promo_code_used`, no order exists and no second redemption row was written
- [x] 3.4 Call it with an unknown code and with a deactivated code; verify each raises its own error and leaves no order behind
- [x] 3.5 With the sale on at 20 percent, call it with `WELCOME25` from a fresh address; verify lines are discounted 25 percent and not 40, and the redemption is still recorded
- [x] 3.6 With the sale raised above the code's percent, call it from a fresh address; verify the sale percent wins and the redemption is still recorded
- [x] 3.7 Call it with a valid code and an out-of-stock item; verify `unavailable_item` still raises and no redemption row survives the rollback
- [x] 3.8 Delete every order and redemption row created by this task group and confirm the counts are back to their pre-test values

## 4. Server

- [x] 4.1 Extend `server/utils/pricing.ts` with the better-of-two resolution so the TypeScript side and `create_order` express one rule; verify a table of sale/promo pairs produces the same cents as the SQL did in task 3
- [x] 4.2 Add `server/utils/promo.ts` to look up a code and report `applied` / `unknown` / `inactive` / `used` for a given email; verify each state against the seeded code
- [x] 4.3 Extract the subscribe-and-welcome logic from `server/api/email-optin.post.ts` into `server/utils/subscribe.ts`; verify the opt-in route still behaves identically for a new, duplicate and invalid address
- [x] 4.4 Make the welcome email read the active code from the database instead of `newsletterPromoCode`, and send without a code when none is active; verify both paths against a running dev server
- [x] 4.5 Accept an optional `promoCode` on `POST /api/cart/preview` and return the discounted lines, subtotal and promo status; verify the cart page and assistant, which send no code, get today's response unchanged
- [x] 4.6 Add the active code's percentage (never the code) to `GET /api/store-settings`; verify the response carries the percent and that no code string appears anywhere in it
- [x] 4.7 Pass the code through `server/api/orders.post.ts` and map the three new errors to 400s the checkout page can distinguish; verify each error produces its own response shape
- [x] 4.8 Accept an opt-in flag on `POST /api/contact` and `POST /api/orders`, calling the shared subscribe helper inside try/catch; verify a forced subscribe failure still delivers the message and still places the order
- [x] 4.9 Add the promo-code rules to the system prompt in `server/utils/assistant.ts` and confirm no tool reads or writes a code; verify by listing the tool definitions and by checking a drafted order submits with no code

## 5. UI

- [x] 5.1 Make `EmailOptinForm.vue` and the footer copy in `app/layouts/default.vue` state the active percentage from `/api/store-settings`, and drop the discount sentence when no code is active; verify both states in the browser
- [x] 5.2 Add the opt-in checkbox to `app/pages/contact.vue`, off by default, reusing the typed email; verify a ticked submission subscribes and an unticked one does not
- [x] 5.3 Add the opt-in checkbox to `app/pages/checkout.vue` on the same terms; verify the same two cases
- [x] 5.4 Add the promo-code field to `app/pages/checkout.vue`, showing the discounted total from `preview` before submit and naming which of the three failures occurred; verify a typo can be corrected without re-entering the other details
- [ ] 5.5 BLOCKED (headless browser will not hydrate; see handoff section 8) Check every new control and the discounted total in dark mode against the layout's `bg-surface-0 dark:bg-surface-900` convention; verify nothing renders white on white

## 6. End-to-end verification

- [ ] 6.1 BLOCKED (headless browser will not hydrate; server path verified via /api/orders) Place a real order through the checkout form with `WELCOME25`, sale on; verify the recorded `total_cents` equals the total shown before submit and the staff email matches
- [ ] 6.2 BLOCKED (same reason as 6.1) Repeat from the same address; verify the code is refused, the buyer is told it was already used, and the order can still be placed without it
- [x] 6.3 Subscribe a fresh address from the footer, the contact form and checkout in turn; verify one row each, the welcome email carries `WELCOME25`, and a repeat tick sends no second email
- [x] 6.4 Ask the assistant for a code, to create one, and to apply one to a draft; verify it declines each, states no code, and that a confirmed draft records no redemption
- [x] 6.5 Deactivate every code and reload the storefront; verify the opt-in copy drops the discount sentence and checkout refuses the code
- [x] 6.6 Restore the sale to the state recorded in task 1.2, delete every order, subscriber and redemption created during verification, and confirm the counts match

## 7. Documentation

- [x] 7.1 Remove `NUXT_NEWSLETTER_PROMO_CODE` from `.env` and `.env.example`, restart the dev server, and verify the welcome email still carries the code from the database
- [x] 7.2 Update `handoff.md`: the promo-code tables and how staff edit them, the better-of-two rule, the retired env var, the dropped 2-argument `create_order`, and the email-as-redemption-key limit; verify no section contradicts another
