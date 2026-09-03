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
count is real rather than aspirational.

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
promo code (`NUXT_NEWSLETTER_PROMO_CODE`, same code for every subscriber).
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
`totalCents: 2400`. The sale was left off and the three test orders placed
during this were deleted afterward. The change's `tasks.md` is now 20/20
checked.

---

## 2. How work is done here — OpenSpec

**Read `AGENTS.md` before writing code.** This repository runs spec-driven
development through OpenSpec, and it is the default workflow, not an option:
anything beyond a trivial fix gets a written, agreed spec before implementation.

```
AGENTS.md                 the working agreement, applies to every AI agent
CLAUDE.md                 points Claude Code at AGENTS.md
.mcp.json                 Supabase MCP server, scoped to this project and to
                          the database and docs tools. See AGENTS.md
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

Six changes have been through the full cycle, all in
`openspec/changes/archive/`:

| Change | Accepted spec |
| --- | --- |
| `2026-08-30-add-dark-mode-toggle` | `specs/theming/color-mode/` |
| `2026-08-31-add-contact-form` | `specs/contact/contact-message/` |
| `2026-08-31-fix-out-of-stock-checkout-block` | `specs/ordering/cart-availability/` |
| `2026-08-31-harden-order-error-paths` | `specs/ordering/failure-reporting/` |
| `2026-09-02-add-digital-file-products` | `specs/catalog/digital-product/` |
| `2026-09-02-add-shopping-assistant` | `specs/assistant/shopping-assistant/` |

Read the dark-mode pair first to see the expected shape of a proposal, design,
tasks and spec.

Two changes are in flight, each with its own artifacts complete and
`openspec validate` passing:

- `openspec/changes/add-email-optin/` — code complete and verified end to end
  (section 1, section 10), not yet archived.
- `openspec/changes/add-store-wide-sale/` — code complete and verified end to
  end (section 1, section 10), not yet archived.

Specs cover theming, contact, the two ordering capabilities above, the
catalogue's file products and the shopping assistant. Everything else in this document predates OpenSpec
and is not backed by a spec, including the storefront tabs added on 2026-09-01.
New work should be.

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
  utils/pricing.ts         salePriceCents()/withSalePricing(), the one rounding
                          rule shared with create_order's SQL
  utils/store-settings.ts  getSaleState(), reads the store_settings singleton
  api/store-settings.get.ts  public sale state: { saleActive, salePercent }
  api/products.get.ts     catalog list, prices discounted when a sale is active
  api/products/[slug].get.ts
  api/cart/preview.post.ts  resolves cart IDs -> current (sale-aware) prices + subtotal
  api/orders.post.ts        rate limit -> validate -> create_order -> email
  api/contact.post.ts       rate limit -> validate -> email. Nothing is stored,
                            so a failed send is reported to the sender
  api/email-optin.post.ts   rate limit -> validate -> upsert (ON CONFLICT DO
                            NOTHING) -> welcome email only on a real insert
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
                                 "N% off" tag; used on the home, product, cart
                                 and checkout pages, no-ops when no sale is active
  stores/assistant.ts            the conversation; NOT persisted, fresh per load
  stores/cart.ts                 IDs + quantities only, persisted
  stores/color-mode.ts           light/dark/system, owns the .dark class
  types/index.ts                 Product, CartLine, CartPreview, StoreSettings
  utils/money.ts                 formatMoney()
  utils/bytes.ts                 formatBytes(), for file sizes
  assets/css/main.css            layer order + Tailwind import

public/
  images/                   6 product photos, <slug>.jpg, free-licensed Pexels

openspec/                 specs and changes -- see section 2
.agents/, .claude/        openspec skills; .claude also holds slash commands
AGENTS.md, CLAUDE.md      the working agreement for AI agents

Also present, not listed above: README.md, package.json, tsconfig.json
```

---

## 5. Order flow (the core of the app)

1. Browser stores `{ productId, quantity }` in the Pinia cart — **never prices**.
2. `POST /api/cart/preview` resolves those IDs against the catalog and returns
   priced lines, a subtotal, and a `missing[]` of IDs no longer in the catalog
   (the cart page removes those automatically).
3. `POST /api/orders` rate-limits by IP (5 per 10 min), Zod-validates the body,
   merges duplicate lines, then calls the `create_order` Postgres RPC. On
   `unavailable_item` the route re-queries `products` and returns the offending
   ids as `data.unavailableProductIds` on the 409, so the checkout page can name
   them; that lookup is best-effort and returns an empty array if it fails.
4. `create_order` (SECURITY DEFINER, one transaction) validates the payload,
   inserts the order, joins `products` to price each line and snapshot its name,
   then writes the total. **This is the single source of truth for pricing.**
   It raises three distinct errors, all of which roll the whole call back:
   - `empty_order` — `p_items` is null, not an array, or empty.
   - `invalid_item` — any line has a null product id or a quantity below 1.
   - `unavailable_item` — a line's product is missing or out of stock. The guard
     compares matched rows against the count of **distinct** product ids.
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

`.env` holds real Supabase and Resend credentials. `.env.example` still holds
placeholders for everything, as intended.

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
NUXT_NEWSLETTER_PROMO_CODE  SET — `WELCOME10` as of 2026-09-03. Server-only;
                            the same code is emailed to every opt-in subscriber

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
so this should just work — the homepage shows six demo products. Only if you are
standing up a **fresh** Supabase project do you need to run `supabase/schema.sql`
then `supabase/seed.sql` in the SQL editor and repoint `.env`.

An agent can now run that SQL itself through the Supabase MCP server configured
in `.mcp.json`, rather than asking you to paste it. The first use needs a
browser OAuth flow; that flow was completed on this machine on 2026-09-03, so
an interactive session here should find `supabase` already connected via
`/mcp` — a non-interactive session or a different machine still starts
unauthorised. See the database section of `AGENTS.md` for what it is scoped to
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

---

## 9. Known problems, not yet fixed

Found by an audit of the code against this document. The three that lived in
the order-notification path have since been fixed; the rest are still open and
were re-verified against the code on 2026-08-31.

- ~~Order email is injectable.~~ **Fixed.** `server/utils/email.ts` now escapes
  every interpolated value through `esc()` / `escMultiline()`. Anything new added
  to that template must go through them too — the customer fields come from a
  public, unauthenticated form.
- **Rate limiting is bypassable.** `server/api/orders.post.ts` and
  `server/api/contact.post.ts` both call
  `getRequestIP(event, { xForwardedFor: true })`, which trusts a client-supplied
  `X-Forwarded-For`. A new header value per request defeats both limits —
  5 orders and 3 contact messages per 10 minutes — which is also the stated
  reason phase 1 skips a captcha. Once a deploy target is chosen, trust only
  that platform's forwarded header. Separately, when no IP resolves at all,
  every caller collapses into one `'unknown'` bucket. The routes use
  separate buckets (`contact:` and `email-optin:` prefixed), so exhausting one
  does not block the others. The contact and opt-in routes are the more
  attractive targets: both send mail with no order behind them.
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

## 10. Not done yet

Known gaps, roughly in the order they were prioritized with the user:

- ~~The email leg has never run.~~ **Done** — verified 2026-08-31, see section 1.
  Still nothing sends to an arbitrary staff address until a domain is verified.
- **No tests of any kind.** The `create_order` regression suite was run ad hoc
  against the live database by an agent and is not committed anywhere.
- **No SPF/DKIM**, because no domain. Admin mail will land in junk until the
  domain is bought and verified in Resend.
- **No customer confirmation email** — only staff are notified.
- **No admin order screen** — Supabase dashboard by decision.
- **No Turnstile/captcha** — phase 2. See the rate-limiting caveat above.
- **No product variants or categories** — user confirmed phase 1 doesn't need
  them. The schema will need real work to add variants.
- ~~The Files tab is a mock.~~ **Done** — verified 2026-09-02. Files are ordinary
  catalogue rows with `kind = 'digital'`, sold through the same cart and order
  path, and staff email the file by hand after payment. There is still no
  storage bucket and no download route, by decision.
- **Files are delivered by hand.** The next step here is the one deferred when
  files were added: when staff mark an order paid, the app emails the customer a
  time-limited link. That needs the file in storage and an order status the
  dashboard can set, neither of which exists.
- **The assistant's daily cap is unproven.** The 25-message cap is verified; the
  75-requests-a-day limit was left untested rather than spend 75 provider calls,
  and it rides on the same limiter as the order and contact routes.
- **The assistant has no transcript.** Nothing about a conversation is stored,
  so when a visitor says the bot ordered the wrong thing there is nothing to
  read. Deliberate, and the open question recorded in the change's design.
- **The assistant does not stream.** A reply lands whole, after a pause of a few
  seconds while the tool loop runs.
- **No stock decrementing.** `in_stock` is a manual boolean; ordering does not
  change it.
- **No deploy target chosen.** Vercel or Netlify were floated, nothing decided.
  `nuxt.config.ts` allows `.trycloudflare.com` through Vite so the dev server can
  be shared through a quick tunnel. That setting does nothing in production.
- ~~Not a git repo.~~ **Done.** `main` has history back to the initial commit;
  `.env` is correctly untracked while `.env.example` is committed. No remote is
  configured yet, so the history exists only on this machine.
- ~~Email opt-in (`openspec/changes/add-email-optin/`) is implemented,
  uncommitted, and unverified.~~ **Done, 2026-09-03.** All 12 tasks in that
  change's `tasks.md` are checked off. The Supabase MCP server's tools turned
  out to be reachable this session (see the gotcha above), so
  `apply_migration` ran directly rather than needing a hand-pasted SQL-editor
  fallback. The manual end-to-end check (curl, not the `puppeteer` MCP tools
  the user had suggested — they weren't needed for a plain API call) covered
  new address, duplicate address and invalid address; the welcome email
  arriving with `WELCOME10` was confirmed by the user via a Gmail screenshot.
  Still uncommitted, and still no test framework in this repo (no
  `vitest`/`jest`, no test script in `package.json`), so the change's own
  "verify with a unit/integration test" lines were satisfied by this manual
  pass instead, same as the rest of the codebase.
- ~~Store-wide sale (`openspec/changes/add-store-wide-sale/`) is implemented,
  uncommitted, and unverified against the live database.~~ **Done, 2026-09-03.**
  All 20 tasks in that change's `tasks.md` are checked off — see section 1 for
  what was verified, including the sale-percent check-constraint bug the live
  migration caught. That document had briefly claimed "14 of 19" checked when
  the real count was 2 of 20; both the count and the underlying verification
  gap are closed now. Still uncommitted.
- **Newsletter opt-in on the contact and order forms.** The user asked
  (2026-09-03) for the same opt-in offer that's in the footer
  (`EmailOptinForm.vue`) to also appear when a visitor completes `/contact` or
  checkout, not just as a standing footer element. Not scoped or built yet —
  needs its own OpenSpec proposal (a checkbox on each form, wired to the
  existing `POST /api/email-optin`, presumably reusing the visitor's
  already-typed email rather than asking for it twice).

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
- The agent has no mailbox access. For an email-delivery check, the user
  confirmed receipt with a screenshot of their inbox (done for the email-optin
  welcome message, 2026-09-03) rather than the agent trying to read it another
  way.
