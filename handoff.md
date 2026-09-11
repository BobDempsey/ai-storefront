# Handoff

Everything needed to pick this project up cold. Written 2026-08-30 at the end of
the initial scaffold, updated the same day after the Supabase project was created,
then revised on 2026-08-31 once the order and email paths had run end to end.
Last reviewed against the code on 2026-09-02, then revised the same day when
files became sellable catalogue rows. Revised again on 2026-09-03 for the
email opt-in change, which is now migrated live and verified end to end, and
again the same day for a second, separate in-flight change that adds a
store-wide sale, also now migrated live and verified end to end. Checked against
the code once more on 2026-09-03: every claim below still holds, and the sale
change's last open task (writing this document) is now ticked, so its 20/20
count is real rather than aspirational. Reviewed against the code again later on
2026-09-03, after both changes were committed and the working tree went clean;
four stale claims found by that pass are corrected below (commit state in
sections 2 and 10, where `SalePrice` is used in section 4, the promo-code line
in section 6, and Supabase MCP in non-interactive sessions in section 7).
Revised again on 2026-09-03 for customer promo codes, which are migrated live
and verified at the database and the API, with three browser-only checks still
open (section 10). A
further pass the same day corrected three more: which routes trust
`X-Forwarded-For` in section 9, the assistant's rate-limit bucket in section 10,
and the product count on the homepage in section 7. A sync later the same day
found the promo-codes change had been committed as `fcb1216` after this
document was last written; section 2 corrected from "Uncommitted" to that
commit hash. A further pass the same day found `.mcp.json` had gained a
`playwright` MCP server (`db6cd90`) since this document was last written, used
it to run the three browser-only promo-code checks the `puppeteer` MCP tool
could not (section 8's gotcha), and closed them out: `add-promo-codes` is now
39/39. Revised again on 2026-09-03 for a third, separate change
(`show-promo-code-in-order-email`) that records which discount priced an order
and shows it in the staff email, proposed, implemented and verified live in
the same session; all 17 of its tasks are checked. A sync on 2026-09-03 found
that change, its archive and this document itself had since been committed
(`808d678`, `093888e`, `a6fb5a2`, `40b0b0c`), plus an unrelated `.gitignore`
addition for `.playwright-mcp` (`1b8ce86`); the working tree is clean. The same
session then archived the two changes that were still sitting complete and
unarchived, `add-store-wide-sale` and `add-promo-codes` (section 2), syncing
their delta specs into a new `catalog/storefront-sale` capability, a new
`promotions/promo-code` capability, and additions to `assistant/shopping-assistant`,
`contact/contact-message` and `newsletter/email-optin`. `openspec validate
--specs --strict` passed all 10 capabilities at the time; there are 12 now,
`ordering/test-order` having arrived with the test suite and
`ordering/customer-confirmation` with the buyer confirmation. That archive move
was committed as `d1f36b2`. A sync the same day found and fixed the checkout bug recorded in
section 9: a rejected promo code stayed in the field and got resent on
Submit. `applyPromoCode` in `app/pages/checkout.vue` now clears the field (and
`appliedCode`) whenever the server comes back with anything other than
`applied`, so a repeat Submit no longer resends the same rejected code.
Verified against a running `npm run dev` through the `playwright` MCP server:
applying an unrecognised code clears the field, and Submit then places the
order at the sale price on the first try. `npm run build` passes. Committed
as `6c70104`. A different session reported reauthorizing the `supabase` MCP
server and deleting the leftover test order this placed (id
`6ea89d95-0625-4128-bf22-7b1ac0a57377`, no promo redemption) via
`execute_sql`, but the session that did this document's own sync still found
`supabase` unauthorized, matching the gotcha in section 8 that
authorization is session-specific, not a standing state. **Verified
2026-09-10** over a working `supabase` MCP connection: `orders` and
`order_items` both return 0 rows for that id, so the deletion did happen.

The same session added a global `Cache-Control: no-store` route rule in
`nuxt.config.ts` (`10110a3`, verified with `npm run build`), created a public
GitHub repo at `https://github.com/BobDempsey/ecommerce-store` and pushed
`main` to it, then started a Vercel deploy from that repo (see section 10).
A `vercel` MCP server is configured (outside this project's `.mcp.json`, at
the user's Claude Code level); like `supabase` it needs an interactive OAuth
authorization this non-interactive session did not have, so Vercel work this
session went through the dashboard by hand instead.

A later session on 2026-09-10 authorized the `vercel` MCP server, confirmed the
production deploy of `e0fd7e1` is READY at
`https://ecommerce-store-kzx5onxny-bobdempseys-projects.vercel.app`, and found
all seven environment variables already set on Production and Preview, so
nothing had to be pushed. That session also verified the test-order deletion
above. It ran `vercel login` and `vercel link`, which left a `.vercel/`
directory and a generated `.env.local` in the working tree, and added
`.vercel` and `.env*` to `.gitignore`; that work is committed as `b9d2ffd`.
The same session then found production serving an error page instead of the
catalogue, traced it to empty environment variables, had the user re-push all
seven from `.env`, redeployed, and confirmed the live store works (section 10).
It then added the first committed test suite, through the OpenSpec change
`add-test-suite`: 60 unit tests, 17 against the live database, two Playwright
end-to-end tests and a production smoke check, plus an `is_test` column on
`orders` so a test run can be told apart from real business and never emails
staff. Section 10 has how to run each part; section 8 has what bit while
writing them.

Two further changes followed the same day, both archived. `add-assistant-tests`
covered the shopping assistant, which the first suite had skipped on the
grounds that testing it costs a provider call: 35 of the 37 tests turned out to
cost nothing, because the rules worth protecting live in `runTool` and
`confirmations.ts` rather than in the model. `trust-configured-client-ip`
replaced the four copies of `getRequestIP(event, { xForwardedFor: true })` with
one resolver that believes only the header a deployment names (section 9).

That last one is worth reading before touching anything here that depends on
the environment. Its first design refused any caller it could not identify, on
the reasoning that a socket address is always present, and every test passed;
the dev server then refused every local request, because its socket carries no
address at all. Vercel had been hiding the original bug for the same class of
reason. Check what the host actually supplies rather than what the code assumes
it supplies.

**This repository is a template**, which is how the remaining work was
prioritised on 2026-09-10: fix what every adopter inherits, and leave what is
particular to this shop. The customer confirmation email was the first group
and is built (section 10); stock decrementing and paid-order file delivery were
in it until the user dropped both the same day. A real store name, a domain and
SPF/DKIM are the second, and the user closed that group the same day too: they
are per-deployment setup, not repo work, and belong in the README as setup
steps. Do not open work on a domain, SPF/DKIM, a store name or a deploy without
asking. No feature work is queued as a result, and the one idea still written
down in section 10 is parked rather than next. `tasks.md` holds only the push
and redeploy that close the gap between local `main` and production
(section 10), which is itself deploy work and so needs the same ask.

A later session on 2026-09-10 also let a visitor use a promo code through the
assistant panel, without the assistant being able to produce one: the code is
typed into a field on the draft card rather than said to the model, so nothing
about it reaches the conversation, the tool list is unchanged and pinned by a
test, and a real model asked to check or guess codes refuses without revealing
whether one exists. Unit coverage went from 146 to 156; the paid suites now
make nine provider calls a run, against the ceiling of ten the user set. See
section 10 and the decision in section 3.

An earlier session the same day built the buyer's own order confirmation, the
first of the three template gaps prioritised above, through the OpenSpec change
`add-customer-order-confirmation` (section 10). Nothing about the order changed:
the confirmation is rendered from the re-read that already feeds the staff
notification, so the two cannot quote different totals, and it is sent after it
in its own `try`/`catch` so neither can affect the other or the committed order.
Verified against a running dev server: two real orders placed through the
checkout form, one sale-priced at 20% and one with `WELCOME25` beating it at
25%, both recording the figures the page showed ($12.80 against $16.00, and
$21.75 against $29.00) with no email failure logged for either. Both orders,
their items and the redemption were deleted afterwards and the sale left on at
20%, matching the state before. Unit coverage went from 123 tests to 146.

Reviewed against the code on 2026-09-10 in an earlier session, which committed
nothing and found the working tree clean at `78b5d6b`. Five stale claims are
corrected below: the capability count above, the change count and table in
section 2, that section's line about the archive move being uncommitted,
`server/utils/client-address.ts` and the test tree missing from section 4's
layout, and the unit-test count in section 10.

Reviewed against the code again on 2026-09-11, working tree clean at `dc44818`.
The find that matters: **`origin/main` is 31 commits behind local `main`**, so
everything since the deploy went up on 2026-09-10 is committed but not
published, and the live store is running none of it (section 10). Four smaller
claims were corrected in place: the unit-test count and file count and the
`test:db` count in section 10, the `llm/` line in section 4's tree, and the
`.mcp.json` line in section 2, which named only the Supabase server. Verified
still true the same day: 15 archived changes and 12 capabilities with no
in-flight change, every path in section 4's layout, the 9 seeded products,
`npm test` green at 156, `npm run test:smoke` green against the production
alias, and the live sale on at 20% with the promo at 25% and
`NUXT_PUBLIC_STORE_NAME` still the `Store` placeholder.

Four navbar and assistant changes followed on 2026-09-11, through the OpenSpec
change `refresh-navbar-and-assistant-entry`: the theme control lost its
`system` icon and became a two-state toggle, the assistant button swapped
`pi-comments` for `pi-microchip-ai`, the panel opens itself once on a first
visit, and its greeting now introduces the assistant in its own voice. The
assistant itself gained nothing: no tool, no prompt rule changed, and the
greeting is storefront copy sitting outside `messages`, so it costs no provider
call and the model never sees it. Unit coverage went from 156 to 180. Verified
against a running dev server through the `playwright` MCP server: the panel
opened unasked on a first load and stayed shut on the next page, a visitor on
`system` under a dark OS saw the moon and went to light on one click, and both
schemes render the new icons and greeting legibly. Verified on a second dev
server with the provider key blanked that the panel does not open itself and
does not spend the visitor's one greeting. `npm test`, `npm run build` and
`npm run test:e2e` all pass. The two decisions worth knowing before editing any
of it are in section 3.

---

## 1. What this is

An ecommerce store **template** built as an MVP for a low-traffic, public-facing
storefront. Payment is deliberately **out of scope** — customers build a cart and
submit an order request; staff receive the order by email and arrange payment
off-app.

Project root: `C:\Users\bobde\Desktop\ecommerce-store`

Status: **the storefront is live against a real database.** A Supabase project
(`forged in filament`, ref `wfhhkdmgouyxnrxnbaeo`) exists, the schema and seed
have been run, and `/api/products` returns all 9 catalogue rows (6 physical,
3 digital) with no `kind` filter — the storefront splits them into tabs
client-side. `create_order` has been executed against the real database and
passes a 7-case regression suite.

The demo catalog is **finished 3D-printed goods** — articulated dragon, cable
organizer, self-watering planter, lithophane lamp, dice tower, drawer bins —
chosen by researching what actually sells on Etsy and Printables. Their photos
are free-licensed Pexels images committed to `public/images/<slug>.jpg` and
referenced as root-relative paths, so the catalog has no external image host.

**The shopping assistant works.** Verified 2026-09-02 against `gpt-5-mini`: it
answers from the catalogue, declines off-topic questions, adds items through the
ordinary cart store, and drafts an order the visitor confirms. A real order was
placed from the drawer end to end, and the address typed into the draft card is
the one recorded, not the one the assistant had collected. Asked for the draft's
confirmation it says it has none, which is true: the server mints it outside
everything the model sees.

**Resend now works.** A real `re_...` key is in `.env`, `NUXT_ORDER_ADMIN_EMAIL`
is the owner's own address (the sandbox sender can only deliver there), and two
orders placed on 2026-08-31 arrived in that inbox with correct line items,
total, reply-to and escaping — including a deliberately awkward payload of
accents, curly quotes, an em dash and raw `<b>` markup, which rendered as text.
The whole order path has now run end to end. Still outstanding for email: no
domain, so no SPF/DKIM, and the sandbox sender delivers only to that one
address.

**Email opt-in is built and verified end to end.** A footer form
(`EmailOptinForm.vue`) lets a visitor submit an email address; `POST
/api/email-optin` validates it, upserts it into a new `email_subscribers`
table with `ON CONFLICT DO NOTHING` so a duplicate address gets the same
response as a new one, and sends a welcome email carrying a single static
promo code (one code for every subscriber, read from the `promo_codes` table
since 2026-09-03; it was `NUXT_NEWSLETTER_PROMO_CODE` when this was built).
The `email_subscribers` migration was applied to the live Supabase project on
2026-09-03 (RLS on, zero policies, matching task 1.1's intent). Verified the
same day against a running `npm run dev`: a new address inserts one row and
delivers the welcome email with the configured code; resubmitting the same
address returns the identical response, inserts no second row, and sends no
second email; an invalid address 400s before touching the database or Resend.
The change's `tasks.md` is now 12/12 checked.

**A store-wide sale is built and verified end to end.** A `store_settings`
singleton table (`sale_active boolean`, `sale_percent numeric`) holds one
on/off switch and one percentage for the whole catalogue. Staff turn it on by
editing that one row's two fields in the Supabase dashboard's table editor —
no admin page, per the existing decision. When active, `create_order`
discounts every line at order time, and `/api/products`, `/api/products/[slug]`,
`/api/cart/preview`, and the shopping assistant's catalogue tools all show the
same discounted price ahead of checkout, via a shared `server/utils/pricing.ts`
rounding rule (round half up, on integer cents) used on both the SQL and
TypeScript sides. `npm run build` passes.

The migration was applied to the live Supabase project on 2026-09-03, after
fixing a bug the live apply caught that no amount of code review had:
`store_settings_sale_percent_range` originally read
`check (sale_percent > 0 and sale_percent <= 100)`, which rejects the
migration's own default row (`sale_active = false, sale_percent = 0`) — the
table couldn't be seeded. Fixed to
`check (sale_active = false or (sale_percent > 0 and sale_percent <= 100))`.
Verified the same day: `create_order` called directly with the sale off
records full price ($24.00) and with it on at 20% records the discounted
total ($19.20, matching hand computation); `/api/products`,
`/api/cart/preview` and the assistant chat endpoint all report $19.20 for the
same item while the sale is active; the storefront (home, product detail,
cart, checkout) shows the struck-through price and "20% off" tag correctly in
both light and dark mode; an order placed through the real checkout form
while the sale was active recorded `totalCents: 1920` and the staff email
matched it; a second order placed after turning the sale back off recorded
`totalCents: 2400`. The sale was left off at the end of that work and the three
test orders placed during it were deleted. **It is on again now:** the user
turned it on later the same day, first at 5% and then at 20%, so the live
storefront is currently showing 20% off every item. Turn it off in the
`store_settings` row when that is no longer wanted. The change's `tasks.md` is now 20/20
checked.

**Customer promo codes are built, migrated and verified at the API.** A code is
a row in `promo_codes` (code, percent, active); staff add and deactivate them in
the Supabase dashboard, the same way they flip the sale. A buyer types one into
the promo field at checkout, `create_order` resolves it and prices every line at
the better of the code and the store-wide sale, never both, then writes a
`promo_redemptions` row in the order's own transaction. A unique index on
`(promo_code_id, lower(btrim(email)))` is what stops a second redemption, so two
simultaneous orders with the same code and address cannot both commit. The
contact and checkout forms each carry an opt-in checkbox that reuses the email
already typed, and the opt-in copy names the active code's percentage rather
than a number written into the page.

Verified 2026-09-03 against the live database: fourteen `create_order` checks
covering no code, a valid code, an unknown code, an inactive code, a
second use by the same address (varying case and spaces), sale-beats-code,
code-beats-sale and a code alongside an out-of-stock item, each confirming both
the total and that a refused call leaves no order and no redemption behind. Then
at the API: `/api/cart/preview` reports 1800 for a 2400 item with `WELCOME25`
while the 20% sale is on (25% wins, not 40%), `/api/orders` records `1800` and
returns a distinguishable 400 for each of the three promo failures, an order
with the box ticked added the subscriber, and `/api/store-settings` carries the
percentage with no code string anywhere in it. The assistant declined three
separate attempts to get, create and apply a code, naming none. Every test row
was deleted afterwards and the sale left on at 20%.

**The three browser-only promo-code checks are done too, verified 2026-09-03
against a real `npm run dev` through the new `playwright` MCP server** (see
section 8: unlike `puppeteer`, it hydrates this app). Checkout in dark mode
renders every new control correctly, including the promo field's green
success text and the "25% off" order-summary tag: nothing white on white. A
real order placed through the checkout form with `WELCOME25` while the 20%
sale was on recorded `total_cents: 2175` against a $29 item, matching the
total shown before submit, with a `promo_redemptions` row for it. Repeating
from the same address showed "That promo code has already been used." and
reverted the summary to the 20%-off price, confirming the reuse block works
end to end, not just in the API tests above. One thing worth knowing:
rejection doesn't clear the promo field, so clicking Submit right after a
rejected Apply resends that same code and the order 400s again — the buyer has
to clear the field first. The order then goes through fine without it
(`total_cents: 1920`, no redemption row). Both test orders and their
redemption row were deleted afterwards; no subscriber rows were created by
this pass. `add-promo-codes` `tasks.md` is now 39/39.

**Order emails now show which discount priced an order, verified end to end.**
`orders` gained four nullable columns — `discount_source` (`'sale'`, `'code'`,
or null), `discount_percent`, `promo_code_snapshot`, `subtotal_cents` — written
once by `create_order` in the same transaction that prices the lines. A later
edit to the sale row or a promo code cannot rewrite what an already-committed
order says it charged; a tie between the two is recorded as the code, so this
record and `promo_redemptions` agree. `server/api/orders.post.ts` re-reads the
four columns and passes them to `sendOrderEmail` only when the order was read
and actually carries a discount; `renderHtml` in `server/utils/email.ts` adds a
subtotal row and a discount row above the total, naming the code and its
percentage or the store sale and its percentage. An undiscounted order's email
is byte-for-byte what it was before this change.

Verified 2026-09-03: `create_order` called directly for four cases (no
discount, code only, sale only, and a deliberate tie — sale set to 25% against
`WELCOME25`'s 25%) all recorded the right source, percentage, code and
subtotal, with the tie resolving to the code as designed. Changing the sale
percentage after an order was committed left that order's recorded percentage
and subtotal unchanged. Three real orders placed through the checkout form
(coded, sale-only, undiscounted) were confirmed by the user via inbox
screenshot: the discount rows render exactly as designed, and the undiscounted
order's email carries no subtotal or discount row at all. `npm run build`
passes. Every test order, its items and its redemption were deleted afterward
and the sale left at 20% active, matching the state before verification
started. The change's `tasks.md` was 17/17 checked and it was archived the
same session: see
`openspec/changes/archive/2026-09-03-show-promo-code-in-order-email/` and
`openspec/specs/ordering/order-notification/`.

---

## 2. How work is done here — OpenSpec

**Read `AGENTS.md` before writing code.** This repository runs spec-driven
development through OpenSpec, and it is the default workflow, not an option:
anything beyond a trivial fix gets a written, agreed spec before implementation.

```
AGENTS.md                 the working agreement, applies to every AI agent
CLAUDE.md                 points Claude Code at AGENTS.md
.mcp.json                 Supabase MCP server, scoped to this project and to
                          the database and docs tools, plus the playwright
                          server added 2026-09-03. See AGENTS.md
openspec/
  config.yaml             schema: spec-driven, plus project context and rules
  specs/                  accepted specs, by capability (theming/color-mode)
  changes/                in-flight changes; archive/ holds completed ones
.agents/skills/           tool-neutral copies of the openspec-* skills
.claude/skills/           the same skills for Claude Code
```

The cycle is **explore -> propose -> apply -> archive**. In Claude Code those are
`/opsx:explore`, `/opsx:propose`, `/opsx:apply`, `/opsx:archive`, plus
`/opsx:update` and `/opsx:sync`. Other tools use the `openspec-*` names.

`config.yaml` sets two project rules worth knowing up front: every proposal must
carry a **Non-goals** section, and any change touching **Supabase schema or RLS**
must say so explicitly. Tasks must flag when they need a migration or a new env
var.

Fifteen changes have been through the full cycle, all in
`openspec/changes/archive/`:

| Change | Accepted spec |
| --- | --- |
| `2026-08-30-add-dark-mode-toggle` | `specs/theming/color-mode/` |
| `2026-08-31-add-contact-form` | `specs/contact/contact-message/` |
| `2026-08-31-fix-out-of-stock-checkout-block` | `specs/ordering/cart-availability/` |
| `2026-08-31-harden-order-error-paths` | `specs/ordering/failure-reporting/` |
| `2026-09-02-add-digital-file-products` | `specs/catalog/digital-product/` |
| `2026-09-02-add-shopping-assistant` | `specs/assistant/shopping-assistant/` |
| `2026-09-03-add-email-optin` | `specs/newsletter/email-optin/` |
| `2026-09-03-add-store-wide-sale` | `specs/catalog/storefront-sale/` |
| `2026-09-03-add-promo-codes` | `specs/promotions/promo-code/`, plus additions folded into `specs/assistant/shopping-assistant/`, `specs/contact/contact-message/` and `specs/newsletter/email-optin/` |
| `2026-09-03-show-promo-code-in-order-email` | `specs/ordering/order-notification/` |
| `2026-09-10-add-test-suite` | `specs/ordering/test-order/`, plus additions folded into `specs/ordering/order-notification/` |
| `2026-09-10-add-assistant-tests` | none — it added tests, and changed no behaviour to spec |
| `2026-09-10-trust-configured-client-ip` | additions folded into `specs/ordering/failure-reporting/` |
| `2026-09-10-add-customer-order-confirmation` | `specs/ordering/customer-confirmation/` |
| `2026-09-11-let-assistant-apply-a-promo-code` | additions folded into `specs/assistant/shopping-assistant/` and `specs/promotions/promo-code/` |

Read the dark-mode pair first to see the expected shape of a proposal, design,
tasks and spec.

`add-store-wide-sale` (code complete and verified end to end, section 1,
section 10, committed as `de3f67d`) and `add-promo-codes` (39 of 39 tasks,
verified end to end, committed as `fcb1216` then `e4ca300`) sat archivable but
un-archived for the rest of that session; both were archived on 2026-09-03 in
a later sync, syncing their delta specs into the main tree (see the top of
this document). That archive move is committed, as `d1f36b2`.

`show-promo-code-in-order-email` was proposed, implemented, verified live and
archived in one session on 2026-09-03 (section 1); its spec is now
`specs/ordering/order-notification/`. It is committed: the feature as
`808d678`, the archive as `093888e`, and this document's record of both as
`a6fb5a2` and `40b0b0c`.

Specs cover theming, contact, three ordering capabilities, the catalogue's
file products and store-wide sale, the shopping assistant, the newsletter and
promo codes. Everything else in this document predates OpenSpec and is not
backed by a spec, including the storefront tabs added on 2026-09-01. New work
should be.

---

## 3. Stack, and why

| Concern | Choice | Reason it was chosen |
| --- | --- | --- |
| Framework | Nuxt 4 (SSR) | Catalog is public — needs SEO and fast product pages, which a pure Vue SPA can't give. Nitro server routes also remove the need for a separate backend. |
| UI | PrimeVue 4.5.5 + Tailwind CSS 4 | PrimeVue was a user requirement; it ships an official Nuxt module. Tailwind handles layout. Pinned to 4.x because 5.x is commercially licensed — see gotchas. |
| State | Pinia + `pinia-plugin-persistedstate` | Cart survives refresh. Note the Nuxt module stores to a **cookie** by default, not localStorage — see gotchas. |
| Data | Supabase (Postgres + RLS) | User's preference; RLS lets the catalog be public-read while orders stay server-only. |
| Email | Resend | Best DX, generous free tier, Vue template support if richer emails are wanted later. |
| Validation | Zod | Payload validation at the API boundary. |

### Decisions already made — do not relitigate without asking

- **Nuxt over a Vue SPA** — SEO for a public catalog.
- **No customer accounts.** Guest checkout only (name/email/phone/notes). No
  auth, minimal RLS surface.
- **No payments in phase 1.** Handled off-app by staff.
- **Server-side pricing.** The browser never sends prices; totals are computed
  in Postgres.
- **Admin UI = the Supabase dashboard** for phase 1. No admin pages were built.
- **No Turnstile/captcha in phase 1** — deferred to phase 2; IP rate limiting
  covers MVP traffic.
- **Resend sandbox sender** (`onboarding@resend.dev`) until a domain is bought.
  No domain exists yet; the user buys one at deploy time.
- **Traffic will be very low during MVP** — in-memory rate limiting is
  sufficient, no Redis.
- **The assistant's permissions are its tool list.** The chat model can search
  the catalogue, read a product, read the priced cart, propose a cart change and
  draft an order. There is no tool that writes anything, and deliberately no
  submit tool.
- **A draft carries a one-time confirmation the model never sees.** The server
  mints it beside the draft, the drawer holds it, and the visitor's Confirm
  click spends it. This does not lock down `/api/orders`, which is public and
  which the checkout page posts to without one. It means a future tool that
  submits for the visitor still cannot: the value submission needs is the one
  value the model was never given.
- **A promo code and a store-wide sale never stack.** `create_order` applies the
  larger of the two percentages and only that one. Stacking was considered and
  rejected: it makes the final total depend on a sale percentage staff change
  casually, and lets the combined discount exceed anything the shop advertised.
  A code the sale beat is still recorded as redeemed, because the buyer used it.
- **Promo codes are rows, not an env var.** `NUXT_NEWSLETTER_PROMO_CODE` is
  gone. A code has to be changeable without a deploy and its redemptions have to
  be recorded, and an env var can do neither.
- **A code is redeemed once per email address, and that is the whole identity
  check.** With no accounts, email is all the shop has. Someone using a second
  address gets a second discount; the cost is one discount, and closing it would
  mean building accounts.
- **The assistant gets no promo tool, ever.** Still true, and still the whole
  guarantee: its permissions are its tool list, so what stops it creating,
  checking, changing or applying a code is that no such tool exists and it is
  never told a code. The system prompt only shapes how it explains the offer
  and declines. A visitor can now use a code through the panel, and this
  decision is exactly why that was built the way it was: the code is typed into
  a field on the draft card, lives in the browser, and reaches the server on
  the same two requests the checkout page makes. It never becomes a tool
  argument and never enters the message history. `TOOL_NAMES` is pinned by a
  test so adding a promo tool has to be a deliberate edit. See section 10.
- **The navbar theme control offers two schemes, not three.** `system` is still
  the default for a new visitor, still honoured by the pre-paint script and
  still settable through `set()`, but the navbar no longer shows it and a
  visitor cannot return to it once they have chosen. `toggle()` derives the
  next scheme from `isDark` rather than from `mode`, which is what makes a
  visitor still on `system` behave sensibly: under a dark OS they are looking
  at dark, so one click owes them light. Branching on `mode` would send them to
  `dark`, which they already had, and the click would look broken.
- **The assistant panel opens itself once per browser, then never again.** The
  flag is a localStorage key of its own (`app/utils/assistant-greeted.ts`), not
  a `persist` block on the assistant store: that store persists nothing, the
  conversation is the thing that must never be persisted, and a `pick` list
  would put that guarantee one careless edit away. A browser that refuses
  storage is treated as already greeted, because a browser that cannot be read
  cannot be written either, and the alternative is a panel that opens on every
  page. The flag is written only when the panel actually opens, so a shop
  running without a provider key still greets the visitor once a key is added.
- **Files are catalogue rows, not a second table.** A downloadable file is a
  `products` row with `kind = 'digital'`, so `create_order` keeps its single
  join and stays the only place a price comes from.
- **Files are delivered by hand, outside the app.** Staff email the file after
  payment. Automating that was explicitly deferred, not forgotten.
- **A file is ordered once.** Cart and `create_order` both cap a file line at
  quantity 1.
- **PrimeVue 4, not 5.** PrimeVue 5 ships under the commercial PrimeUI licence
  and renders an "Invalid PrimeUI License" banner without a key. The free
  Community License would have covered this project, but 4.5.5 is MIT with no
  key and no annual renewal, so the project was pinned back to 4.

---

## 4. Layout

```
nuxt.config.ts            modules, Tailwind vite plugin, PrimeVue theme, runtimeConfig,
                          vite.server.allowedHosts for quick tunnels
.env / .env.example       secrets (.env is gitignored)

supabase/
  schema.sql              tables (incl. email_subscribers, store_settings),
                          RLS policies, create_order() function
  seed.sql                6 physical products and 3 downloadable files

server/
  utils/supabase.ts       memoized service-role client (bypasses RLS)
  utils/rate-limit.ts     in-memory sliding-window limiter
  utils/schemas.ts        Zod schemas + mergeItems() duplicate collapsing
  utils/email.ts          Resend sends: order notification, contact message,
                          newsletter welcome (sendWelcomeEmail)
  utils/pricing.ts         resolveDiscountPercent() (better of sale and code),
                          discountedCents(), salePriceCents(), withSalePricing().
                          The one rounding rule shared with create_order's SQL
  utils/store-settings.ts  getSaleState(), reads the store_settings singleton
  utils/promo.ts           checkPromoCode() -> applied/unknown/inactive/used,
                          getActivePromo(). Reading side only; create_order is
                          what actually resolves a code on an order
  utils/subscribe.ts       subscribeEmail() and subscribeQuietly(), shared by the
                          opt-in form, the contact form and checkout
  utils/client-address.ts  resolveClientAddress() and rateLimitByCaller(). The one
                          place any route decides who is calling; believes only
                          the header NUXT_TRUSTED_IP_HEADER names
  api/store-settings.get.ts  public sale state plus the active code's percent.
                          Never the code itself
  api/products.get.ts     catalog list, prices discounted when a sale is active
  api/products/[slug].get.ts
  api/cart/preview.post.ts  resolves cart IDs -> current (sale-aware) prices +
                            subtotal. An optional promoCode prices the lines with
                            the code too and reports promoStatus; advisory only
  api/orders.post.ts        read test token -> rate limit -> validate ->
                            create_order -> email. A valid x-test-order-token
                            skips both the limiter and the email
  api/contact.post.ts       rate limit -> validate -> email. Nothing is stored,
                            so a failed send is reported to the sender
  api/email-optin.post.ts   rate limit -> validate -> subscribeEmail()
  api/chat.get.ts           whether the assistant is configured, no key shipped
  api/chat.post.ts          rate limit -> validate -> gpt-5-mini tool loop
  utils/assistant.ts        the five tools, their handlers and the system prompt;
                            its own catalogue queries are sale-aware too
  utils/confirmations.ts    one-time draft confirmations, in memory, 15 min TTL

app/
  app.vue, layouts/default.vue   header w/ cart badge, footer
  pages/index.vue                Products and Files tabs, both from the catalogue
  pages/products/[slug].vue      product detail
  pages/cart.vue                 quantities, server-priced subtotal
  pages/checkout.vue             guest details form + summary
  pages/order-received.vue       confirmation, shows order id
  pages/contact.vue              contact form; replaced the navbar mailto link
  components/AssistantDrawer.vue chat drawer: messages, cart strip, order draft
  components/EmailOptinForm.vue  email field + submit, in the footer
  components/SalePrice.vue       struck-through original + discounted price +
                                 "N% off" tag; used on the home, product and
                                 cart pages, no-ops when no sale is active.
                                 Checkout does NOT use it: it reads salePercent
                                 off the first preview line and renders its own
                                 "N% off" Tag beside an already-discounted total
  stores/assistant.ts            the conversation; NOT persisted, fresh per load
  stores/cart.ts                 IDs + quantities only, persisted
  stores/color-mode.ts           light/dark/system, owns the .dark class.
                                 toggle() is what the navbar calls and only
                                 reaches light and dark; set() still takes
                                 all three
  types/index.ts                 Product, CartLine, CartPreview, StoreSettings
  utils/money.ts                 formatMoney()
  utils/bytes.ts                 formatBytes(), for file sizes
  utils/assistant-greeted.ts     the one-per-browser flag behind the panel's
                                 first-visit auto-open. Deliberately not part
                                 of the assistant store, which persists nothing
  assets/css/main.css            layer order + Tailwind import

public/
  images/                   6 product photos, <slug>.jpg, free-licensed Pexels

openspec/                 specs and changes -- see section 2
.agents/, .claude/        openspec skills; .claude also holds slash commands
AGENTS.md, CLAUDE.md      the working agreement for AI agents

tests/
  unit/                     no network, no database; setup.ts supplies the Nuxt
                            auto-imports Vitest does not
  db/                       against the live Supabase project, needs npm run dev
  e2e/                      Playwright, cart through placed order
  llm/                      eight real gpt-5-mini calls across two files; costs
                            money, as does the one excluded e2e browser test
  smoke/                    against the deployed site

Also present, not listed above: README.md, package.json, tsconfig.json,
playwright.config.ts, and one vitest config per suite (vitest.config.ts plus
vitest.db, vitest.llm and vitest.smoke). Section 10 has what each one runs.
```

---

## 5. Order flow (the core of the app)

1. Browser stores `{ productId, quantity }` in the Pinia cart — **never prices**.
2. `POST /api/cart/preview` resolves those IDs against the catalog and returns
   priced lines, a subtotal, and a `missing[]` of IDs no longer in the catalog
   (the cart page removes those automatically).
3. `POST /api/orders` rate-limits by IP (5 per 10 min, skipped for a request
   carrying a valid `x-test-order-token`), Zod-validates the body,
   merges duplicate lines, then calls the `create_order` Postgres RPC. On
   `unavailable_item` the route re-queries `products` and returns the offending
   ids as `data.unavailableProductIds` on the 409, so the checkout page can name
   them; that lookup is best-effort and returns an empty array if it fails.
4. `create_order(jsonb, jsonb, text)` (SECURITY DEFINER, one transaction)
   validates the payload, resolves the promo code if one was typed, inserts the
   order, joins `products` to price each line at the better of the sale and the
   code and snapshot its name, writes the redemption row if a code was used, then
   writes the total. **This is the single source of truth for pricing.**
   It raises six distinct errors, all of which roll the whole call back:
   - `empty_order` — `p_items` is null, not an array, or empty.
   - `invalid_item` — any line has a null product id or a quantity below 1.
   - `unavailable_item` — a line's product is missing or out of stock. The guard
     compares matched rows against the count of **distinct** product ids.
   - `unknown_promo_code`, `inactive_promo_code`, `promo_code_used` — the code
     does not exist, is switched off, or this address already used it. All three
     are raised before the order row is written, and `/api/orders` maps each to
     its own 400 carrying `data.promoStatus`, because the remedy differs: a typo
     is worth retrying, an address that already used the code is not.
   Duplicate product ids are summed into one line inside the function, so
   `mergeItems()` in `server/utils/schemas.ts` is now belt-and-braces rather
   than the only thing preventing duplicate lines.
   A file line above quantity 1 also raises `invalid_item`: a file is emailed
   once, so a second copy delivers nothing. The storefront caps it too, so only
   a client that bypasses the page reaches that guard.
5. The route re-reads the order + items and emails staff via Resend, with
   `reply-to` set to the customer. Email failure is logged, not surfaced — the
   order row is already committed and is the real record.
6. Client clears the cart and lands on `/order-received?id=<uuid>`.

---

## 6. Environment

`.env` holds real Supabase and Resend credentials. `.env.example` holds
placeholders for every secret. One entry there is a real value rather than a
placeholder, deliberately: `NUXT_ORDER_FROM_EMAIL` is the Resend sandbox sender.
It is not a credential, so it is safe to commit.

```
NUXT_SUPABASE_URL           SET — https://wfhhkdmgouyxnrxnbaeo.supabase.co
NUXT_SUPABASE_SERVICE_KEY   SET — an sb_secret_... key. SERVER ONLY, never expose
NUXT_RESEND_API_KEY         SET — a real re_... key, verified sending
NUXT_ORDER_FROM_EMAIL       onboarding@resend.dev until a domain is verified
NUXT_ORDER_ADMIN_EMAIL      SET — the owner's address, which is also the Resend
                            account address. The sandbox sender will not deliver
                            anywhere else until a domain is verified
NUXT_OPENAI_API_KEY         SET — a real sk-proj... key, powers the assistant.
                            SERVER ONLY. Blank it and the drawer reports the
                            assistant unavailable; nothing else changes
NUXT_PUBLIC_STORE_NAME      PLACEHOLDER — still "Store", not "forged in filament"
NUXT_TRUSTED_IP_HEADER      x-vercel-forwarded-for — the only header the rate
                            limiter believes about who is calling. Not a secret.
                            Set it to your host's header if you leave Vercel;
                            empty means the connection address alone
NUXT_TEST_ORDER_TOKEN       SET locally — a random hex string. SERVER ONLY. Lets a
                            request mark an order as a test, which skips the staff
                            email. Deliberately NOT set on Vercel: unset means no
                            request can mark anything

`NUXT_NEWSLETTER_PROMO_CODE` is gone as of 2026-09-03. The promo code lives in
the `promo_codes` table, so staff can change it and its redemptions can be
recorded. `WELCOME25` at 25% is the seeded, active row.

`NUXT_PUBLIC_CONTACT_EMAIL` is gone. The navbar's mailto link was replaced by
the `/contact` form, which delivers to `NUXT_ORDER_ADMIN_EMAIL`, so no address
is rendered into the page or shipped to the browser.
```

Nuxt maps these to `runtimeConfig` automatically via the `NUXT_` prefix. The URL
in `.env` is the project base URL — **not** the `/rest/v1/` API URL the Supabase
Data API page shows.

Supabase issues `sb_publishable_...` / `sb_secret_...` keys rather than the older
`anon` / `service_role` JWTs. The secret key is the service-role equivalent and
works with `@supabase/supabase-js` unchanged.

---

## 7. Getting it running

```bash
npm install --legacy-peer-deps     # the flag is required, see gotchas
npm run dev                        # http://localhost:3000
```

The database is already provisioned and seeded, and `.env` already points at it,
so this should just work: the homepage shows the catalogue's 9 rows, 6 under a
Products tab and 3 under Files. Only if you are
standing up a **fresh** Supabase project do you need to run `supabase/schema.sql`
then `supabase/seed.sql` in the SQL editor and repoint `.env`.

An agent can now run that SQL itself through the Supabase MCP server configured
in `.mcp.json`, rather than asking you to paste it. The first use needs a
browser OAuth flow; that flow was completed on this machine on 2026-09-03, so
a session here finds `supabase` already connected. The stored authorisation
holds for non-interactive sessions too: one on 2026-09-03 ran `execute_sql`
against the live database with no prompt. A different machine still starts
unauthorised, and a non-interactive session cannot run the OAuth flow, so it
has to be done once interactively there. See the database section of `AGENTS.md` for what it is scoped to
and what to watch for.

Env changes are not hot-reloaded; restart `npm run dev` after editing `.env`. The
dev server binds IPv6, so if `curl 127.0.0.1:3000` hangs, use `http://[::1]:3000`.

The email path works end to end; the Resend sandbox sender can only deliver to
the email address on the Resend account, so changing `NUXT_ORDER_ADMIN_EMAIL` to
a different staff address will silently fail until a domain is verified.

---

## 8. Gotchas discovered during setup

- **`npm install` fails without `--legacy-peer-deps`.** npm 10.9.3 throws
  `Cannot read properties of null (reading 'edgesOut')` (an arborist peer-set
  bug) while resolving Nuxt 4.5's dependency graph. Clearing the cache did not
  help. Switching to pnpm would also fix it if the user is open to that.
- **Node is v22.18.0; `undici@8.10.0` wants >=22.19.0.** Warning only, nothing
  has broken yet — but upgrade Node before blaming anything weird on the app.
- **Do not let PrimeVue drift back to 5.** `npm install primevue` resolves to v5,
  which is commercially licensed and paints an "Invalid PrimeUI License" banner
  over the site. The project is pinned to the last MIT release: `primevue@4.5.5`,
  `@primevue/nuxt-module@4.5.5`, `@primeuix/themes@1.2.5`. Use **v4** docs for
  component APIs. The `@primeuix/themes/aura` import in `nuxt.config.ts` is
  correct for 4.3+ and did not need changing.
- **Zod 4 is installed.** `z.string().email()` and `z.string().uuid()` in
  `server/utils/schemas.ts` are the deprecated v3 spellings; v4 prefers `z.email()`
  and `z.uuid()`. Both still work today.
- **`ClientOnly` wraps cart-dependent UI.** The cart hydrates from its persisted
  store after mount, so rendering it during SSR causes hydration mismatches. Keep
  that wrapper on anything reading `useCartStore()` state.
- **`pinia-plugin-persistedstate/nuxt` defaults to cookies, not localStorage.**
  `persist: true` on `app/stores/cart.ts` therefore writes a `cart` cookie, sent
  to the server on every request. `app/stores/color-mode.ts` opts out with
  `storage: piniaPluginPersistedstate.localStorage()`, which it must: the
  pre-paint theme script in `nuxt.config.ts` reads `localStorage` directly.
  Whether the cart should move to localStorage too is an open question. Two
  comments in `app/stores/cart.ts` and `app/pages/cart.vue` used to claim the
  cart lived in localStorage; both now say cookie, checked 2026-09-02. Because
  the cookie is sent with every request, the cart is in fact available during
  SSR, so the `ClientOnly` wrappers guard against the mismatch between an empty
  server-side Pinia store and a hydrated client one rather than against a
  missing store.
- **Tailwind/PrimeVue layer order** is set in two places. They are deliberately
  **not identical** and should not be "fixed" to match: `app/assets/css/main.css`
  declares the full page order `@layer theme, base, primevue, components,
  utilities;`, while `cssLayer` in `nuxt.config.ts` declares only PrimeVue's own
  `theme, base, primevue`. This is PrimeVue's documented pairing.
- **Never hardcode `bg-white` on a surface.** Dark mode is class-driven, and the
  layout sets `dark:text-surface-0` on the body, so a white card renders white
  text on white and the content looks like it is simply missing. Follow the
  layout's convention instead: `bg-surface-0 dark:bg-surface-900` with
  `border-surface-200 dark:border-surface-800`. This bit the product, cart and
  checkout cards; check any new card against dark mode before calling it done.
- **Windows dev-server lock.** `npm run dev` refuses to start if another Nuxt dev
  process holds the lock; kill it by PID first. Note `taskkill` fails under Git
  Bash (path mangling) — use PowerShell `Stop-Process -Id <pid> -Force`.
- **`create or replace function` does not replace a function whose signature
  changed.** Adding `p_promo_code` to `create_order` created a *second*
  function; both stayed callable, and the two-argument one would have silently
  ignored promo codes while keeping its own grants. The migration drops
  `create_order(jsonb, jsonb)` explicitly first, and re-runs both `revoke
  execute` lines against the new signature, because those do not carry over.
  Check `pg_proc` for exactly one `create_order` after any future signature
  change.
- **The `puppeteer` MCP browser on this machine does not hydrate the app.** On
  2026-09-03 it served and rendered pages fine (SSR markup, the pre-paint theme
  script, `window.__NUXT__`) but the client bundle never ran: `header button`
  came back as 0, clicking "Add to cart" changed nothing, and `captureScreenshot`
  eventually timed out. Restarting it with different launch options changed
  nothing. So it is usable for checking server-rendered markup and useless for
  anything needing a click. **The `playwright` MCP server, added to
  `.mcp.json` on 2026-09-03, does not have this problem** — it hydrates the
  app normally, clicks and form fills work, and it was used the same day to
  close out the three browser-only promo-code checks (section 1, section 10).
  Prefer it over `puppeteer` for anything needing a click.
- **The `playwright` MCP browser shows a Chrome infobar reading "You are using
  an unsupported command-line flag: --disable-blink-features=AutomationControlled.
  Stability and security will suffer."** on every page. Cosmetic only, from
  the launch flag Playwright uses to avoid bot detection; every screenshot
  taken with this tool carries it, so crop or ignore that banner rather than
  treating it as an app error.
- **`npm run dev` may attach to a port you did not expect.** A dev server was
  already holding 3000, so a second `npm run dev` silently took 3001 and its
  console output went to the new log while every `curl localhost:3000` hit the
  older process. Check the log line for the port before trusting that the server
  you are reading logs from is the one answering your requests.
- **Resend refuses `example.com` addresses outright.** A welcome email to a
  made-up test address fails with "Invalid to field. Please use our testing
  email address instead", which is separate from the sandbox-sender limit. So an
  opt-in test with a fake address returns 502 even though the subscriber row was
  written. Use the owner's address for anything that has to actually send.
- **`/mcp` reporting a server connected does not mean its tools are callable
  in the current agent turn.** On 2026-09-03, running `/mcp` mid-session
  reported `supabase` as one of 3 connected servers, but a `ToolSearch` for
  Supabase tools in that same session still found none, both before and
  after. Don't trust `/mcp`'s summary line alone — confirm with a real tool
  call (or `ToolSearch`) before relying on a server. **Resolved in a later
  session the same day:** `ToolSearch` for `mcp__supabase__*` and a real
  `list_tables`/`apply_migration` call both succeeded — it was session-
  specific, not a standing problem. The email-optin migration (section 1,
  section 10) was applied this way.
- **The `vercel` MCP server has no tool for environment variables.** It can
  list projects, deployments and build logs, but reading or setting env vars
  goes through the `vercel` CLI instead. The CLI is logged in on this machine
  and the project is linked (`prj_GcjYs1vWVVoE2ePPfh2iyA5gcLRw`, team
  `bobdempseys-projects`, hobby plan), so `vercel env ls` works directly. Like
  `supabase`, the MCP server's OAuth is interactive and a non-interactive
  session cannot run it.
- **An environment variable set to an empty string overrides the
  `runtimeConfig` default rather than falling back to it.** Seven Vercel
  variables existed with the right names and empty values, so `supabaseUrl`
  came through as `''` and every server route answered "Supabase is not
  configured", which reads exactly like a missing variable. `vercel env ls`
  hides values, so it cannot tell the two apart. The cheap test is
  `curl -s <url>/ | grep -o 'storeName[^,}]*'`: the build default is `Store`,
  so `storeName:""` in the payload proves the environment is reaching the
  server and is empty, while the default proves it is not reaching it at all.
- **Adding a Vercel environment variable does not update deployments that
  already exist.** The first production build ran 13 minutes before the
  variables were created and never saw them. `vercel redeploy <url>` builds a
  new deployment against the current variables and re-points the alias.
- **The Claude Code auto-mode classifier blocks any command that moves secret
  values**, including `vercel env pull` and a script that pipes `.env` values
  into `vercel env add`. The working pattern is to write the script to the
  scratchpad and have the user run it from their own shell. Their terminal is
  Git Bash, not PowerShell, so hand them
  `powershell -ExecutionPolicy Bypass -File "<path>"` rather than a bare `&`
  call, which is a Bash syntax error.
- **Do not probe the order rate limit with real orders.** The test-order token
  deliberately skips the limiter, so exercising the limiter means posting
  without it, and every one of those sends a real staff email. Five reached the
  owner's inbox on 2026-09-10 that way. Post a deliberately invalid body
  instead: `rateLimitByCaller` runs before Zod, so a 400 still spends the
  bucket while creating no order and sending no mail.
- **A dev server left running for half an hour can stop hydrating the app.**
  On 2026-09-10 both Playwright tests failed at the same line: "Add to cart"
  clicked, and no `cart` cookie ever appeared. The page server-rendered fine
  and the same suite had passed earlier. The cause was the dev server itself,
  running since before that session's edits and through a run of HMR reloads;
  `playwright.config.ts` sets `reuseExistingServer: true`, so the suite
  attached to it rather than starting a clean one. Killing it and letting
  Playwright start its own made both tests pass unchanged. Before believing a
  hydration failure, restart the dev server. Note that the suite shuts down a
  server it started, so `npm run test:db` afterwards needs one brought back up.
- **A bind probe on `127.0.0.1` reports a busy port as free.** Nuxt's dev
  server binds IPv6, so `net.createServer().listen(port, '127.0.0.1')`
  succeeds while a server is still answering on `[::1]`. Ask over HTTP instead;
  the same fact is why `curl 127.0.0.1:3000` hangs where `http://[::1]:3000`
  works.
- **A Playwright click can land before Vue hydrates, and then does nothing.**
  Nuxt server-renders the markup, so "Add to cart" is visible and clickable
  before any listener is attached. Playwright clicks the moment it is visible,
  the click hits dead markup, no cart cookie is written, and `/checkout`
  bounces to `/cart`. The symptom is a detached-element timeout on a button
  three steps later, which points nowhere near the cause. `await
  page.waitForLoadState('networkidle')` after every `goto` fixes it; see
  `tests/e2e/checkout.spec.ts`.
- **Do not set `vite.server.watch.ignored` in `nuxt.config.ts`.** It replaces
  chokidar's default ignore list rather than adding to it, so `node_modules`
  and `.nuxt` come back under watch and the dev server reload-storms. Playwright
  artifacts are kept out of the watcher by writing them under
  `node_modules/.cache/playwright` instead (`playwright.config.ts`).
- **`create_order` cannot gain a defaulted parameter without dropping the old
  signature.** Postgres overloads on signature, so the old and new functions
  both stay callable and a call with the old argument count becomes ambiguous.
  `supabase/schema.sql` now drops the two- and three-argument versions before
  creating the four-argument one.
- **Postgres integer division will silently truncate a rounding check.**
  Verifying `discountedCents` against `round(cents * (100 - pct) / 100)` with
  integer literals gives the wrong answer, because the division happens in
  integers before `round` sees it. `v_percent` is `numeric` in `create_order`;
  cast the percentage when checking by hand, or the two look like they
  disagree when they do not.
- **A clean Playwright context looks exactly like a first-time visitor.** Once
  the assistant panel gained its first-visit auto-open, every e2e test started
  from a context with no `assistant-greeted` flag, so the panel opened over the
  catalogue and swallowed the "Add to cart" click. `tests/e2e/global-setup.ts`
  now seeds the flag and saves a `storageState` file that `playwright.config.ts`
  points every test at. Anything else this app comes to do on a first visit
  needs the same treatment, and the symptom will look like the stale-dev-server
  hydration failure above rather than like the feature that caused it.
- **A second dev server needs `NUXT_IGNORE_LOCK=1`.** The Windows dev-lock
  gotcha above refuses a second `npm run dev` outright. To check behaviour with
  an environment variable changed, start one with `NUXT_IGNORE_LOCK=1
  NUXT_PORT=3100` and the variable set on that command, rather than editing
  `.env`, which loses the real credential the moment the run is killed.
  `tests/db/chat-guards.test.ts` does exactly this and is the worked example.
- **A green `npm run test:smoke` does not mean your code is deployed.** It
  asks the production alias four questions the store has answered correctly
  since 2026-09-10, so it passes just as well against a build from before
  anything you wrote. Vercel builds from `origin/main`, not the working tree,
  so the check that the live site is current is `git status -sb` — if it says
  `ahead N`, production is N commits old however green the suite is. This is
  how the 31-commit gap in section 10 went unnoticed.

---

## 9. Known problems, not yet fixed

Found by an audit of the code against this document. The three that lived in
the order-notification path have since been fixed; the rest are still open and
were re-verified against the code on 2026-08-31.

- ~~Order email is injectable.~~ **Fixed.** `server/utils/email.ts` now escapes
  every interpolated value through `esc()` / `escMultiline()`. Anything new added
  to that template must go through them too — the customer fields come from a
  public, unauthenticated form.
- ~~Rate limiting is bypassable.~~ **Fixed, 2026-09-10.** All four routes now
  go through `rateLimitByCaller` in `server/utils/client-address.ts`, which
  reads only the header named by `NUXT_TRUSTED_IP_HEADER` and otherwise the
  connection's own address. A client-supplied `X-Forwarded-For` is ignored
  unless a deployment names it, and a multi-value header is read from the last
  value, not h3's first, because the last is the one the trusted proxy wrote.
  Verified live: six orders sent with six different spoofed `x-forwarded-for`
  values now exhaust one allowance at the fifth, where previously all six were
  accepted. Two things worth knowing. **Vercel was masking this**: it overwrites
  `X-Forwarded-For` itself, so the deployed site was never exposed and a test
  against production would have proved nothing. And **the dev server exposes no
  client address at all**: the request's socket object exists but its
  `remoteAddress` is null, so anything that treats "no address" as fatal
  refuses every local request. It is not fatal here: unidentifiable callers
  share one bucket and the server logs `[rate-limit] no client address
  resolved`. That pooling is the remaining weakness, chosen over refusing them
  (which takes a shop offline) and over serving them freely (which is a way
  around every limit).
- ~~A thrown email error 500s the customer after the order is committed.~~
  **Fixed.** `sendOrderEmail` is now wrapped in `try`/`catch` in
  `server/api/orders.post.ts`, so section 5's promise actually holds: the
  committed order is returned to the customer whatever the notification does.
- ~~The post-insert re-read ignores its errors.~~ **Fixed.** Both queries' errors
  are logged, and an `incomplete` flag puts a visible warning banner at the top
  of the staff email telling them to check the dashboard instead of trusting a
  `$0.00` total.
- ~~Out-of-stock lines are a checkout dead end.~~ **Fixed.** An out-of-stock
  line is now marked in the cart, offered a Remove button, excluded from the
  subtotal with a note saying so, and blocks checkout on both the cart and
  checkout pages until it is removed. Deleted products (`missing[]`) are still
  removed automatically — and that removal now runs immediately rather than
  waiting for a later fetch, which previously left the deleted id in the cart
  and in the header count. See
  `openspec/changes/fix-out-of-stock-checkout-block/`.
- ~~`rate-limit.ts` is described as a fixed window.~~ **Fixed** — the docstring
  and section 4 now say sliding window. Whether a sliding window is the right
  choice is still open, alongside the `X-Forwarded-For` issue above.
- ~~`/api/cart/preview` leaks raw database errors.~~ **Fixed.** The 502 now
  carries a generic sentence and the underlying error goes to the server log
  under a `[cart]` prefix, matching the other routes.
- ~~A failed re-read reaches the customer as `$0.00`.~~ **Fixed.** It was a
  latent contract bug rather than a visible figure — nothing rendered
  `totalCents` — but `/api/orders` no longer defaults it: the response is
  `{ orderId }` alone when the re-read failed and `{ orderId, totalCents }` when
  it succeeded, typed as optional in `app/types/index.ts` so a consumer has to
  check. The staff email keeps its `incomplete` banner.
- ~~A rejected promo code stays in the field and gets resent.~~ **Fixed,
  2026-09-10, committed as `6c70104`.** `applyPromoCode` now clears
  `form.promoCode` and `appliedCode` whenever the server's status is anything
  but `applied`, so a rejected code cannot sit in the field for a following
  Submit to resend. See the top of this document.

## 10. Not done yet

Known gaps, roughly in the order they were prioritized with the user:

- ~~The email leg has never run.~~ **Done** — verified 2026-08-31, see section 1.
  Still nothing sends to an arbitrary staff address until a domain is verified.
- ~~No tests of any kind.~~ **Done, 2026-09-10.** A committed suite now runs in
  four parts, each with its own script, because they need different things to
  be true before they can pass:
  - `npm test` — 180 unit tests across 14 files, over `pricing`, `promo`,
    `rate-limit`, `schemas`, `client-address`, the assistant's read and write
    tools, its promo boundary, `confirmations`, the orders route, the customer
    email, the colour-mode toggle and the panel's first-visit auto-open. It was
    60 when this suite landed; the assistant, client-address,
    buyer-confirmation, assistant-promo and navbar changes brought the rest. No
    network, no database, under a second. Run these on every save. The three
    newest files test Pinia stores rather than server utilities, which is why
    `vitest.config.ts` now carries a `~` alias and `setup.ts` stubs
    `piniaPluginPersistedstate`: a store reads that while its module is being
    evaluated, so it has to exist before a test file imports one. `tests/unit/setup.ts` supplies the Nuxt
    auto-imports (`createError`, `useSupabase`) that server code expects and
    Vitest does not provide.
  - `npm run test:db` — 28 tests across 5 files that call the real
    `create_order` and `POST /api/orders` against the **live** Supabase
    project, including the drawer's promo path. Needs `npm run dev` already
    running.
  - `npm run test:e2e` — Playwright, cart through placed order, including the
    rejected-promo-code clear from `6c70104`. Starts a dev server if none is up,
    and shuts down one it started, so `test:db` afterwards needs one brought
    back. Free: `playwright.config.ts` excludes the one browser test that costs
    a provider call.
  - `npm run test:e2e:llm` — that excluded test, through
    `playwright.llm.config.ts`: a promo code applied on the assistant's draft
    card, in a browser, through to a placed order. One provider call, because
    the cart is filled by clicking and a single message asks for the draft.
  - `npm run test:smoke` — checks the deployed site. Fails when the network or
    the deploy is down, which is why it is not in `npm test`.
  - `npm run test:llm` — two real `gpt-5-mini` calls through a running dev
    server, added 2026-09-10. The only script that spends money. **The dollar
    cost of a run was not measured**: the route logs no token usage, so read it
    from the OpenAI dashboard if it matters. What is measured is that a run
    makes two requests, takes about 18 seconds, and that each request is capped
    at five completions by `MAX_TOOL_ROUNDS` in `chat.post.ts`, so ten
    short-prompt calls is the ceiling. It is eight requests now, not two:
    `tests/llm/assistant-promo.test.ts` added six covering what a real model
    does when pushed on promo codes. With `test:e2e:llm` that is nine provider
    calls across the paid suites, against a ceiling of ten the user set on
    2026-09-10. Adding a tenth means taking one out.
- **The assistant's own coverage is 35 unit tests plus those two live ones.**
  The unit tests are the ones that matter: they check that `runTool` resolves
  every slug against the database so an invented item cannot reach the browser
  as an intent, that an out-of-stock product and a second copy of a file are
  refused, that a draft carries no confirmation into the history the provider
  sees, and that a confirmation is spent exactly once. The live pair exists for
  the one thing they cannot cover: whether the model still calls the tools at
  all. Every unit test would pass in full if it stopped.
- **`tests/db/chat-guards.test.ts` starts a second dev server on port 3100**
  with `NUXT_OPENAI_API_KEY` blank, to prove the 503. It kills the process tree
  in teardown and waits for the port; a bare `kill()` leaves Nuxt holding it on
  Windows, because `npm run dev` is a shell wrapping the real process.
- **Test orders live in the live database.** There is no throwaway project, so
  the tests write real rows and mark them `is_test`. Anything reading orders as
  business to fulfil must filter `where not is_test`; the Supabase dashboard's
  default view will not. Each test deletes its own rows in an `afterEach`, and
  `sweepStaleTestOrders` clears anything older than an hour that a crashed run
  left behind. A test order never emails staff.
- **`POST /api/orders` marks an order as a test only for a request carrying the
  `x-test-order-token` header matching `NUXT_TEST_ORDER_TOKEN`.** A wrong or
  missing token yields an ordinary order rather than an error, and an unset
  token means no request can mark anything, which is the production setting.
  The gate is a secret rather than the build environment on purpose: gating on
  "not production" would mean production ran a branch no test ever exercised.
  A request holding the token also skips the order rate limiter. The suites
  share one IP with everything else on the machine, and five orders per ten
  minutes is spent by a single `test:db` plus `test:e2e` run, so without this
  the second run fails on a 429 that says nothing about the code. Every request
  without the token is limited exactly as before, which in production is all of
  them.
- **No SPF/DKIM**, because no domain, and neither is repo work. Admin mail
  lands in junk and the buyer confirmation reaches no real customer until a
  domain is bought and verified in Resend. That is a per-deployment setup step
  the adopter takes, explicitly set aside by the user on 2026-09-10 along with
  the custom domain and the `Store` placeholder still standing in for
  `NUXT_PUBLIC_STORE_NAME` in production. The three were meant to land in the
  README as setup steps instead; checked 2026-09-11, they have not. `README.md`
  has a Setup section and it mentions no domain, no SPF/DKIM and no store name,
  so an adopter is currently told none of it. Writing those steps is repo work
  and is the one piece of this group that does not need a deploy.
- ~~No customer confirmation email.~~ **Built, 2026-09-10**, through the
  OpenSpec change `add-customer-order-confirmation`. A committed order now
  sends the buyer their own copy as well as notifying staff:
  `sendCustomerEmail` and `renderCustomerHtml` in `server/utils/email.ts`,
  called from `server/api/orders.post.ts` after the staff notification and in
  its own `try`/`catch`. It states the order id, the priced lines and the
  total, the same subtotal and discount rows staff see when the order was
  discounted, that no payment has been taken and that staff will make contact,
  and, for an order containing a file, that the file follows once payment is
  arranged. Reply-to is the staff address, the mirror of the staff email's
  reply-to being the buyer. No schema change, no new environment variable.
  Three rules are worth knowing before editing it: a test order sends neither
  email, a failed re-read sends the buyer nothing at all (staff get a warning
  banner and a dashboard to check against, where a buyer handed a $0.00 order
  with no lines has neither), and neither send can fail the order or the other
  email. **The sandbox sender still delivers only to the Resend account
  address, so a real buyer receives nothing until a domain is verified.** Read
  that silence as the missing domain, not as a bug in this code.
- **No admin order screen** — Supabase dashboard by decision.
- **No Turnstile/captcha** — phase 2. See the rate-limiting caveat above.
- **No product variants or categories** — user confirmed phase 1 doesn't need
  them. The schema will need real work to add variants.
- ~~The Files tab is a mock.~~ **Done** — verified 2026-09-02. Files are ordinary
  catalogue rows with `kind = 'digital'`, sold through the same cart and order
  path, and staff email the file by hand after payment. There is still no
  storage bucket and no download route, by decision.
- **Files are delivered by hand, and that stays.** Briefly prioritised on
  2026-09-10, then dropped the same day at the user's direction: staff email
  the file once payment is arranged, which is what the confirmation email now
  tells the buyer will happen. Do not build automated delivery without asking.
  If it is ever revived, the groundwork is worth knowing: `orders.status`
  exists, defaults to `'new'`, and is read or written by nothing anywhere in
  the codebase, so the status a dashboard would set is free to define; and
  `AGENTS.md` forbids agents from touching Supabase storage, so standing up a
  bucket needs either a human or a change to that agreement.
- **The assistant's daily cap is unproven, and will stay that way.** The
  25-message cap is covered by a test (`tests/db/chat-guards.test.ts`); the
  75-requests-a-day limit was left untested rather than spend 75 provider
  calls, and on 2026-09-10 the user settled that it is not worth proving. It
  uses the same `rate-limit.ts` module as the order and contact routes, which
  the unit tests do cover, but its own `chat:` bucket on a 24-hour window, so
  it neither spends nor is spent by their allowances.
- **The assistant has no transcript.** Nothing about a conversation is stored,
  so when a visitor says the bot ordered the wrong thing there is nothing to
  read. Deliberate, and the open question recorded in the change's design.
- **The assistant does not stream.** A reply lands whole, after a pause of a few
  seconds while the tool loop runs.
- **No stock decrementing, and none wanted.** `in_stock` is a manual boolean;
  ordering does not change it. Briefly prioritised on 2026-09-10, then dropped
  the same day at the user's direction: staff flip the boolean in the Supabase
  dashboard and that is enough for this shop. Do not build it without asking.
  If it is ever revived, note that `products`
  has no quantity column at all, and the constraint
  `products_digital_in_stock_check` forbids a digital row from ever being out of
  stock, so a count column has to leave files alone. `create_order` checks
  availability by row count on a `join products p on ... and p.in_stock`, not by
  reading a number.
- ~~No deploy target chosen.~~ **Decided, 2026-09-10: Vercel.** A deploy was
  started from the Vercel dashboard against the new GitHub repo. Its "Optional
  Integrations" step offered to provision Resend and Supabase through Vercel's
  own marketplace; both were declined, since the project already has working
  accounts for both and should point at them with the existing `.env`
  credentials as Vercel environment variables, not new provisioned resources.
  `nuxt.config.ts` still allows `.trycloudflare.com` through Vite so the dev
  server can be shared through a quick tunnel; that setting does nothing in
  production. **Deployed and working 2026-09-10**, at
  `https://ecommerce-store-theta-sable.vercel.app` (the production alias; the
  per-deployment URLs sit behind Vercel's deployment protection and answer a
  login page to anything that is not a signed-in browser, so verify against
  the alias). Getting there took two false starts, both recorded in section 8:
  the first deploy predated the environment variables, and the variables that
  did exist held empty values. All seven are now set on Production and
  Preview from the local `.env`: `NUXT_SUPABASE_URL`,
  `NUXT_SUPABASE_SERVICE_KEY`, `NUXT_RESEND_API_KEY`, `NUXT_ORDER_FROM_EMAIL`,
  `NUXT_ORDER_ADMIN_EMAIL`, `NUXT_PUBLIC_STORE_NAME`, `NUXT_OPENAI_API_KEY`.
  `/api/products` and `/api/store-settings` both return 200 on five
  consecutive calls, and the catalogue renders. Still open: no custom domain,
  and `NUXT_PUBLIC_STORE_NAME` is the `Store` placeholder in production
  because that is what `.env` holds.
- **Production is 31 commits behind local `main`, found 2026-09-11.**
  `origin/main` is still `e0fd7e1`, the commit that recorded the deploy
  starting, and Vercel builds from the remote. So the live store predates the
  whole test suite, the `trust-configured-client-ip` rate-limit fix, the
  buyer's confirmation email and the assistant's promo field, even though the
  working tree is clean and every one of those is committed locally. `npm run
  test:smoke` passing is not evidence to the contrary: its four checks pass
  against the old build too. Pushing closes the gap and Vercel redeploys on
  its own, but **ask before doing it** — the user set aside deploy work on
  2026-09-10, and the rate-limit fix in particular changes who the deployed
  limiter believes, which is worth flagging before it ships rather than after.
- ~~Not a git repo.~~ ~~No remote is configured yet.~~ **Done, 2026-09-10.**
  `main` has history back to the initial commit; `.env` is correctly untracked
  while `.env.example` is committed. Pushed to
  `https://github.com/BobDempsey/ecommerce-store` (public, created with `gh
  repo create --public --source=. --remote=origin --push`) after confirming
  nothing tracked in the repo carries a real secret: `.env` is untracked,
  `.env.example` holds only placeholders, and a grep across the tree for
  Supabase/Resend/OpenAI key prefixes turned up only false positives
  (`store_settings`, `sync`, `before`, none of them credentials).
- ~~Email opt-in (`openspec/changes/add-email-optin/`) is implemented,
  uncommitted, and unverified.~~ **Done, 2026-09-03.** All 12 tasks in that
  change's `tasks.md` are checked off. The Supabase MCP server's tools turned
  out to be reachable this session (see the gotcha above), so
  `apply_migration` ran directly rather than needing a hand-pasted SQL-editor
  fallback. The manual end-to-end check (curl, not the `puppeteer` MCP tools
  the user had suggested — they weren't needed for a plain API call) covered
  new address, duplicate address and invalid address; the welcome email
  arriving with `WELCOME10` was confirmed by the user via a Gmail screenshot.
  Committed as `8012c44`. Still no test framework in this repo (no
  `vitest`/`jest`, no test script in `package.json`), so the change's own
  "verify with a unit/integration test" lines were satisfied by this manual
  pass instead, same as the rest of the codebase.
- ~~Store-wide sale (`openspec/changes/add-store-wide-sale/`) is implemented,
  uncommitted, and unverified against the live database.~~ **Done, 2026-09-03.**
  All 20 tasks in that change's `tasks.md` are checked off — see section 1 for
  what was verified, including the sale-percent check-constraint bug the live
  migration caught. That document had briefly claimed "14 of 19" checked when
  the real count was 2 of 20; both the count and the underlying verification
  gap are closed now. Committed as `de3f67d`.
- ~~Newsletter opt-in on the contact and order forms.~~ **Built, 2026-09-03**,
  as part of `add-promo-codes`. Both forms carry a checkbox, off by default,
  reusing the email that form already collects, and a failed subscription is
  logged rather than allowed to fail the message or the order.
- ~~Three promo-code checks are unverified, all of them browser-only.~~ **Done,
  2026-09-03**, using the new `playwright` MCP server (section 8). Checkout
  renders correctly in dark mode, a real order with `WELCOME25` recorded the
  right discounted total and redemption row, and a same-address repeat was
  refused with the "already been used" message. See section 1 for the full
  results, including the promo-field UX quirk this pass found (section 9).
- ~~No one has read a promo-code welcome email.~~ **Done, 2026-09-03.** The
  user confirmed both by inbox screenshot: with `WELCOME25` active the email
  is titled "You're subscribed, here's your promo code" and reads "Your promo
  code: WELCOME25 for 25% off your first order"; with every code deactivated
  it reverts to the plain "You're subscribed" / "Thanks for subscribing" copy,
  no code block at all.
- ~~Order emails don't show whether a promo code was used.~~ **Done,
  2026-09-03.** `orders` gained four nullable columns (`discount_source`,
  `discount_percent`, `promo_code_snapshot`, `subtotal_cents`), written once by
  `create_order` in the same transaction that prices the lines, immune to a
  later edit of the sale or the code table. On a tie between the two, the code
  is recorded. The staff email now shows a subtotal and a discount row naming
  the code or the store sale, above the total; an undiscounted order's email is
  unchanged. See `openspec/changes/show-promo-code-in-order-email/`.
- ~~The assistant cannot use a promo code.~~ **Built, 2026-09-10**, through
  the OpenSpec change `let-assistant-apply-a-promo-code`. The draft card in the
  panel now carries a promo field beside the details it already collects,
  behaving as the checkout page's does: apply, see the total change, a refused
  code clears itself. Confirming sends the code with the confirmation, and
  `create_order` prices, records and redeems it exactly as a checkout order.
  **The assistant gained nothing.** No tool, no argument, no knowledge of any
  code; one sentence of `SYSTEM_PROMPT` changed to name the field, and a
  visitor who types a code at the assistant is told where the field is rather
  than having it applied. That is the answer to "can the agent be exploited
  here": it is not in the path at all, rather than being in the path and
  restrained. `tests/unit/assistant-promo-boundary.test.ts` pins the tool list
  and asserts no tool result can carry a code;
  `tests/llm/assistant-promo.test.ts` checks a real model refuses to say
  whether a code exists, which is what would otherwise make a conversation a
  way to enumerate codes. Verified live: an order placed through the drawer
  with `WELCOME25` recorded 1600 to 1200 at 25% with one redemption, and the
  same address was then refused that code at checkout.

---

## 11. Working style notes for the next agent

- The user prefers **one decision at a time** and pushed back on long
  recommendation lists. Ask, get an answer, move on.
- They asked what RLS and `fk` meant — do not assume deep Postgres background,
  and explain database terms briefly when they come up.
- They confirmed phase 1 scope explicitly; treat scope expansion as needing an
  ask, not an assumption.
- They prefer verification work to run in **background agents** so the main
  conversation stays short. The `create_order` suite and the audit behind
  section 9 were both run that way.
- When a SQL snippet needs running, they would rather have it **copied to their
  clipboard** than pasted into chat to select by hand.
- They work in very short turns: `y`, `yn`, `go`, "1 sentence". Answer the
  question asked at that length, act, and report the outcome in a line. Long
  status write-ups get cut off rather than read.
- They will hand over a multi-part feature in one message (the promo-code work
  arrived as five numbered items plus a restriction) and expect it routed
  through OpenSpec rather than built directly.
- The agent has no mailbox access. For an email-delivery check, the user
  confirmed receipt with a screenshot of their inbox (done for the email-optin
  welcome message, 2026-09-03) rather than the agent trying to read it another
  way.
