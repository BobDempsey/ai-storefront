## Context

See proposal.md for motivation.

The constraint that shapes everything here is that neither discount leaves a
usable trace on the order today. `order_items.unit_price_cents` holds the
already-discounted unit price, `orders.total_cents` holds their sum, and
`create_order` throws away the percentage it applied as soon as it returns.
A promo code leaves a `promo_redemptions` row tied to the order, but a
store-wide sale leaves nothing at all: the percentage lives in the mutable
`store_settings` singleton, which staff edit casually and have already changed
twice in one day.

`create_order` prices each line as `round(price_cents * (100 - percent) / 100)`,
round half up, per line. That rounding is not reversible from the total, so a
pre-discount figure has to be computed while the catalogue prices are still in
hand rather than derived afterwards.

## Goals / Non-Goals

**Goals:**

- The discount that priced an order survives on the order row, immune to later
  edits of the sale or the code table.
- The staff email is legible without arithmetic: subtotal, discount, total.
- No change to how a discount is chosen, or to what a buyer sees.

**Non-Goals:**

- Reworking `create_order`'s pricing or its error contract. Only what it
  records changes.
- Any per-line discount record. One discount applies to the whole order.
- Changing the subject line, which already carries the charged total.

## Decisions

**Record the discount on the order row rather than re-reading it afterwards.**
The alternative was to leave the schema alone and have `/api/orders` join
`promo_redemptions` to `promo_codes` on `order_id` after the insert, reading
`store_settings` for the sale case. Rejected on two counts: the sale case has
nothing to join to, so its percentage would come from a row that may already
have changed, and the reconstruction is a guess dressed as a fact. Writing it
in `create_order`'s own transaction makes the order self-describing, which also
answers the question in the Supabase dashboard, not just in the inbox.

**Four nullable columns on `orders`, no defaults.**

- `discount_source text` — `'code'`, `'sale'`, or null for no discount
- `discount_percent numeric` — the percentage actually applied
- `promo_code_snapshot text` — the code as matched, null unless a code applied
- `subtotal_cents integer` — the total at catalogue prices

Nullable with no default is deliberate. Every order written before this change
keeps null across all four, which reads as "not recorded" rather than as a
genuine zero discount. This is the same care the project already takes over a
`$0.00` total that was never read. `promo_code_snapshot` follows the existing
snapshot naming on `order_items`, and for the same reason: the code has to
survive a rename or a deletion in `promo_codes`.

**A coherence constraint that accepts the legacy all-null shape.** The check
allows exactly three shapes: all four null (legacy), a source of null with a
zero percentage and no code, or a source of `'code'`/`'sale'` with a positive
percentage and a code present only for `'code'`. It has to accept the all-null
row or the `alter table` fails on the existing orders, which is precisely how
`store_settings_sale_percent_range` blocked its own migration last time.

**On a tie, the code is recorded as the offer.** When a code and the sale carry
the same percentage, `greatest()` cannot say which won, but `create_order`
writes the redemption row either way. Recording `'code'` keeps the email and
the `promo_redemptions` table telling the same story about that order.

**The subtotal is computed from the catalogue inside the transaction**, by
joining the inserted `order_items` back to `products`, not by inflating the
total by the percentage. Per-line round-half-up makes the latter wrong by up to
a cent per line.

**All four are written in the existing closing `update orders`.** That
statement already runs after the lines are inserted, which is when the subtotal
can be computed, so the four columns and `total_cents` are set together and
there is one place to read.

**`create or replace` is enough this time.** The signature stays
`(jsonb, jsonb, text)`, so the trap the promo-code change hit, where a new
argument created a second callable function and the old one kept its grants,
does not apply. Confirm one `create_order` in `pg_proc` after applying anyway.

**The email payload carries a discount or carries nothing.**
`OrderEmailPayload` gains an optional discount holding source, percent, code
and pre-discount subtotal. It is left off when the re-read failed and when the
order predates the columns, so `renderHtml` has one condition to test and
cannot render a half-known discount. The rendering is two extra rows in the
existing `tfoot`, above the total.

## Risks / Trade-offs

- **The coherence constraint rejects rows the live table already holds** →
  Accept the all-null shape explicitly, and apply to the live project early;
  the last check constraint written here passed review and still failed on
  contact with real data.
- **Staff read the percentage in an old email as the current sale** → Word the
  line as what priced this order, not as a live offer.
- **A future code path writes an order without the new columns** →
  `create_order` is the only writer of `orders`, and the constraint refuses an
  incoherent combination, so a half-written discount cannot be committed.
- **Rollback drops attribution written between deploy and rollback** → The
  columns are additive and nothing reads them but the email, so dropping them
  restores today's behavior; the lost data is the attribution itself.

## Migration Plan

1. Add the four columns and the constraint to `supabase/schema.sql`, and update
   `create_order` in the same file, so a fresh project stands up complete.
2. Apply to the live project through the Supabase MCP server, the same route
   the last two migrations took.
3. Verify against the live database before touching the email: place an order
   with a code, one during a sale, and one with neither, and read the four
   columns back on each.
4. Then wire the route and the email, and confirm a real order's inbox copy.
5. Delete the verification orders and their redemption rows afterwards, and
   leave the sale in the state it started in.

Rollback is `alter table orders drop column` on the four, plus restoring
`create_order`'s previous body. Committed orders keep their totals either way.

## Open Questions

- Whether a customer confirmation email, if one is ever built, should show the
  same discount block. It does not exist yet and nothing here forecloses it.
