## 1. Record the discount on the order

- [x] 1.1 Record the store-wide sale's current state before touching anything, so task 4.5 can restore it; note the value in this file. Recorded 2026-09-03: `sale_active: true, sale_percent: 20`.
- [x] 1.2 Add `discount_source`, `discount_percent`, `promo_code_snapshot` and `subtotal_cents` to `orders` in `supabase/schema.sql` as nullable columns with no default, using `add column if not exists` so the file still stands up a fresh project; verify the statements are idempotent by reading them back
- [x] 1.3 Add the coherence constraint across the four columns, accepting the all-null legacy shape, a null source with a zero percentage, and a `'code'`/`'sale'` source with a positive percentage and a code only for `'code'`; verify it accepts every existing `orders` row before it is applied anywhere
- [x] 1.4 Rewrite `create_order`'s body to track which offer won, recording `'code'` on a tie, and to set the four columns in the closing `update orders` alongside `total_cents`, computing `subtotal_cents` by joining the inserted `order_items` back to `products`; verify the signature is unchanged so `create or replace` applies cleanly
- [x] 1.5 Apply the migration to the live Supabase project through the MCP server; verify `pg_proc` holds exactly one `create_order` afterwards and the four columns exist on `orders`
- [x] 1.6 Call `create_order` directly against the live database for four cases (no discount, code only, sale only, code and sale together) and verify each records the right source, percentage, code and subtotal, and that the subtotal matches the catalogue prices by hand computation. Also ran a tie case (sale set to 25% against `WELCOME25`'s 25%) to confirm the code wins per design.md. All four matched hand computation; test rows deleted, sale restored to 20% active.

## 2. Carry the discount to the notification

- [x] 2.1 Extend the post-insert re-read in `server/api/orders.post.ts` to select the four new columns; verify a failed re-read still leaves `incomplete` set and asserts no discount
- [x] 2.2 Add the optional discount to `OrderEmailPayload` in `server/utils/email.ts` and pass it from the route only when the order was read and carries a recorded discount; verify an order with null columns passes no discount rather than a zero one

## 3. Show it in the staff email

- [x] 3.1 Render a subtotal row and a discount row above the total in `renderHtml`, naming the promo code and its percentage or the store-wide sale and its percentage, wording it as what priced this order rather than a live offer; verify the three figures agree with each other
- [x] 3.2 Escape the code through the existing `esc()` helper; verify a code containing HTML characters renders as text
- [x] 3.3 Leave an undiscounted order's email exactly as it is today; verify it shows no subtotal row and no discount row

## 4. End-to-end verification

- [x] 4.1 Place an order through the checkout form with a code while a sale is active, and verify the recorded columns, the emailed figures and the total shown before submit all agree. Order `b1e4847c` ($18.00 shown, $24.00 subtotal, `code`/25%/`WELCOME25` recorded) — all agree.
- [x] 4.2 Place an order with the sale active and no code, and verify the email names the store-wide sale rather than a code. Order `79bbe1fa` ($25.60 shown, `sale`/20% recorded).
- [x] 4.3 Place an order with no discount at all, and verify the email is unchanged from today's. Order `516b569e` ($48.00, `discount_source` null, `subtotal_cents` equals `total_cents`).
- [x] 4.4 Change the sale percentage after 4.2's order is committed, and verify that order's recorded percentage and subtotal do not move. Set to 35%; order `79bbe1fa` still reads 20% / $25.60 / $32.00 subtotal.
- [x] 4.5 Delete every order, redemption and subscriber created during verification, restore the sale to the state recorded in task 1.1, and confirm the counts match. All three inbox emails were confirmed by the user via screenshot first (subtotal/discount rows present and correct on 4.1/4.2, absent on 4.3). Orders, redemptions: 0. No subscriber rows were created. Sale restored to `sale_active: true, sale_percent: 20`.

## 5. Record what was learned

- [x] 5.1 Update `handoff.md` with the new columns, what was verified and on what date, and strike the section 9 entry saying order emails do not show promo usage; verify the document's outstanding-work section no longer lists this gap
