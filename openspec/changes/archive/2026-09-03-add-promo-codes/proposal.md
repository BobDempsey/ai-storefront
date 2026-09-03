## Why

The shop already emails a promo code to every new subscriber, but the code does
nothing: there is no field to type it into, nothing in `create_order` reads it,
and no record of who used one. Staff would have to honour it by hand off-app,
and nothing stops the same code being used on every order forever. The offer is
also invisible where it would convert best, because the opt-in form only exists
in the footer, not on the contact or checkout forms a visitor is already filling
in.

This change makes the code real: a discount the buyer applies at checkout, worth
a configured percentage off their first order, redeemable once per email address.

## What Changes

- **Promo codes become database rows, not an env var.** A `promo_codes` table
  holds the code, its percentage, and whether it is active. Staff edit it in the
  Supabase dashboard, the same way they already flip the store-wide sale.
  **BREAKING**: `NUXT_NEWSLETTER_PROMO_CODE` is retired. The welcome email reads
  the active code from the database instead, so the code in the email and the
  code checkout accepts can never drift apart.
- **A promo code field on the checkout form.** The buyer types a code, the
  server validates it before the order is placed, and `create_order` applies the
  discount. Pricing stays server-side: the browser never sends a percentage.
- **Redemption is recorded and enforced.** A `promo_redemptions` row ties a code
  to the email address that used it and the order it was used on. A second
  attempt by the same address is refused.
- **A promo code and a store-wide sale never stack.** `create_order` compares
  the sale percentage against the code's percentage and applies only the larger.
  A buyer gets the better of the two offers, never both, so the total can never
  fall below the deepest single discount the shop published.
- **The opt-in offer states the discount.** Every place the opt-in appears says
  what the subscriber gets, worded from the active code's percentage rather than
  a hardcoded number, so the copy cannot promise 25% while checkout gives 10%.
- **Opt-in checkboxes on the contact and checkout forms.** Both reuse the email
  address the visitor has already typed, so nobody types it twice. Neither
  checkbox blocks its form: a failed subscription never fails a contact message
  or an order.
- **The assistant knows codes exist and can never touch one.** It can tell a
  visitor that subscribing earns a code and that codes are entered at checkout.
  It gets no tool that reads, creates, edits, invalidates or redeems a code, and
  it never states a specific code or a discounted total that a code produced.

**This change touches Supabase schema and RLS.** It adds two tables
(`promo_codes`, `promo_redemptions`), both with RLS enabled and no policies, so
they are unreachable from the browser and readable only through the service-role
key. It also rewrites `create_order`, which is the shop's single source of truth
for pricing.

## Capabilities

### New Capabilities

- `promotions/promo-code`: What a promo code is, how a buyer redeems one at
  checkout, the once-per-address rule, what happens when a code is unknown,
  inactive or already used, and how a code resolves against an active
  store-wide sale.

### Modified Capabilities

- `newsletter/email-optin`: The opt-in offer now states the discount the
  subscriber receives, and opting in is available from the contact and checkout
  forms rather than the footer alone. The welcome email's code comes from the
  database rather than a configured value. Note this capability is not yet
  accepted: it lives in `openspec/changes/add-email-optin/`, which is complete
  and committed but not archived. Archive that change before this one is
  applied, so the delta has a main spec to modify.
- `contact/contact-message`: Sending a contact message can now also subscribe
  the sender, when they tick the box.
- `assistant/shopping-assistant`: Adds what the assistant may say about promo
  codes, and a standing prohibition on it manipulating one.

## Impact

- `supabase/schema.sql`: two new tables, their RLS, and a rewritten
  `create_order` that takes a code and resolves it against the sale. Needs a
  migration against the live project.
- `server/utils/promo.ts` (new): resolves a code to its percentage and checks
  redemption, sharing one rule with the SQL side the way `pricing.ts` already
  does for the sale.
- `server/api/orders.post.ts`: passes the code through and maps new
  `create_order` errors to responses the checkout page can act on.
- `server/api/contact.post.ts`, `server/api/email-optin.post.ts`: honour the
  opt-in flag.
- `server/utils/email.ts`: welcome email reads the active code from the database.
- `server/utils/assistant.ts`: system prompt gains the promo-code rules. No new
  tool is added, deliberately.
- `app/pages/checkout.vue`, `app/pages/contact.vue`,
  `app/components/EmailOptinForm.vue`, `app/layouts/default.vue`: the field, the
  checkboxes and the offer copy.
- `.env` / `.env.example`: `NUXT_NEWSLETTER_PROMO_CODE` removed.

## Non-goals

- **No per-subscriber unique codes.** One shared code, as today. Codes unique to
  each subscriber would need a generator, a much larger table, and a way to
  reissue a lost one.
- **No admin UI.** Staff manage codes in the Supabase dashboard, matching the
  existing decision for the catalogue and the store-wide sale.
- **No expiry dates, usage caps, or per-product codes.** A code is active or it
  is not.
- **No fixed-amount codes.** Percentages only.
- **No free shipping or shipping logic**, which the shop does not have.
- **No stacking of two codes on one order.** One code per order.
- **No retroactive discount.** A code applies when the order is placed and never
  to an order already committed.
