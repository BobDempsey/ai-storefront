# Handoff

Everything needed to pick this project up cold. Written 2026-08-30 at the end of
the initial scaffold; updated the same day after the Supabase project was created
and the order path was tested end to end.

---

## 1. What this is

An ecommerce store **template** built as an MVP for a low-traffic, public-facing
storefront. Payment is deliberately **out of scope** — customers build a cart and
submit an order request; staff receive the order by email and arrange payment
off-app.

Project root: `C:\Users\bobde\Desktop\ecommerce-store`

Status: **the storefront is live against a real database.** A Supabase project
(`forged in filament`, ref `wfhhkdmgouyxnrxnbaeo`) exists, the schema and seed
have been run, and `/api/products` returns 6 products. `create_order` has been
executed against the real database and passes a 7-case regression suite.

The demo catalog is **finished 3D-printed goods** — articulated dragon, cable
organizer, self-watering planter, lithophane lamp, dice tower, drawer bins —
chosen by researching what actually sells on Etsy and Printables. Their photos
are free-licensed Pexels images committed to `public/images/<slug>.jpg` and
referenced as root-relative paths, so the catalog has no external image host.

**Resend now works.** A real `re_...` key is in `.env`, `NUXT_ORDER_ADMIN_EMAIL`
is the owner's own address (the sandbox sender can only deliver there), and two
orders placed on 2026-08-31 arrived in that inbox with correct line items,
total, reply-to and escaping — including a deliberately awkward payload of
accents, curly quotes, an em dash and raw `<b>` markup, which rendered as text.
The whole order path has now run end to end. Still outstanding for email: no
domain, so no SPF/DKIM, and the sandbox sender delivers only to that one
address.

---

## 2. How work is done here — OpenSpec

**Read `AGENTS.md` before writing code.** This repository runs spec-driven
development through OpenSpec, and it is the default workflow, not an option:
anything beyond a trivial fix gets a written, agreed spec before implementation.

```
AGENTS.md                 the working agreement, applies to every AI agent
CLAUDE.md                 points Claude Code at AGENTS.md
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

One change has been through the full cycle already —
`openspec/changes/archive/2026-08-30-add-dark-mode-toggle/` — and its accepted
spec now lives at `openspec/specs/theming/color-mode/spec.md`. Read that pair
first to see the expected shape of a proposal, design, tasks and spec.

Note that most of the work recorded in this document predates OpenSpec being
added, so the rest of the repo is not yet backed by specs. New work should be.

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
- **PrimeVue 4, not 5.** PrimeVue 5 ships under the commercial PrimeUI licence
  and renders an "Invalid PrimeUI License" banner without a key. The free
  Community License would have covered this project, but 4.5.5 is MIT with no
  key and no annual renewal, so the project was pinned back to 4.

---

## 4. Layout

```
nuxt.config.ts            modules, Tailwind vite plugin, PrimeVue theme, runtimeConfig
.env / .env.example       secrets (.env is gitignored)

supabase/
  schema.sql              tables, RLS policies, create_order() function
  seed.sql                6 demo products

server/
  utils/supabase.ts       memoized service-role client (bypasses RLS)
  utils/rate-limit.ts     in-memory sliding-window limiter
  utils/schemas.ts        Zod schemas + mergeItems() duplicate collapsing
  utils/email.ts          Resend send + HTML order table
  api/products.get.ts     catalog list
  api/products/[slug].get.ts
  api/cart/preview.post.ts  resolves cart IDs -> current prices + subtotal
  api/orders.post.ts        rate limit -> validate -> create_order -> email

app/
  app.vue, layouts/default.vue   header w/ cart badge, footer
  pages/index.vue                product grid
  pages/products/[slug].vue      product detail
  pages/cart.vue                 quantities, server-priced subtotal
  pages/checkout.vue             guest details form + summary
  pages/order-received.vue       confirmation, shows order id
  stores/cart.ts                 IDs + quantities only, persisted
  stores/color-mode.ts           light/dark/system, owns the .dark class
  types/index.ts                 Product, CartLine, CartPreview
  utils/money.ts                 formatMoney()
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
5. The route re-reads the order + items and emails staff via Resend, with
   `reply-to` set to the customer. Email failure is logged, not surfaced — the
   order row is already committed and is the real record.
6. Client clears the cart and lands on `/order-received?id=<uuid>`.

---

## 6. Environment

`.env` holds real Supabase credentials and placeholder Resend ones. `.env.example`
still holds placeholders for everything, as intended.

```
NUXT_SUPABASE_URL           SET — https://wfhhkdmgouyxnrxnbaeo.supabase.co
NUXT_SUPABASE_SERVICE_KEY   SET — an sb_secret_... key. SERVER ONLY, never expose
NUXT_RESEND_API_KEY         SET — a real re_... key, verified sending
NUXT_ORDER_FROM_EMAIL       onboarding@resend.dev until a domain is verified
NUXT_ORDER_ADMIN_EMAIL      SET — the owner's address, which is also the Resend
                            account address. The sandbox sender will not deliver
                            anywhere else until a domain is verified
NUXT_PUBLIC_STORE_NAME      PLACEHOLDER — still "Store", not "forged in filament"
NUXT_PUBLIC_CONTACT_EMAIL   SET — currently the owner's personal address, which
                            renders as a public mailto link in the navbar. Swap it
                            for a store address before deploying; leave it blank to
                            hide the icon entirely
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
  Whether the cart should move to localStorage too is an open question.
  Beware two stale comments that claim otherwise: the docstring in
  `app/stores/cart.ts` and the `onMounted` comment in `app/pages/cart.vue` both
  say the cart lives in localStorage. It does not. Because the cookie is sent
  with every request, the cart is in fact available during SSR, so the
  `ClientOnly` wrappers guard against the mismatch between an empty server-side
  Pinia store and a hydrated client one rather than against a missing store.
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

---

## 9. Known problems, not yet fixed

Found by an audit of the code against this document. The three that lived in
the order-notification path have since been fixed; the rest are still open and
were re-verified against the code on 2026-08-31.

- ~~Order email is injectable.~~ **Fixed.** `server/utils/email.ts` now escapes
  every interpolated value through `esc()` / `escMultiline()`. Anything new added
  to that template must go through them too — the customer fields come from a
  public, unauthenticated form.
- **Rate limiting is bypassable.** `server/api/orders.post.ts:5` calls
  `getRequestIP(event, { xForwardedFor: true })`, which trusts a client-supplied
  `X-Forwarded-For`. A new header value per request defeats the 5-per-10-minutes
  limit — which is also the stated reason phase 1 skips a captcha. Once a deploy
  target is chosen, trust only that platform's forwarded header. Separately,
  when no IP resolves at all, every caller collapses into one `'unknown'` bucket.
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
- **No stock decrementing.** `in_stock` is a manual boolean; ordering does not
  change it.
- **No deploy target chosen.** Vercel or Netlify were floated, nothing decided.
- ~~Not a git repo.~~ **Done.** `main` has history back to the initial commit;
  `.env` is correctly untracked while `.env.example` is committed. No remote is
  configured yet, so the history exists only on this machine.

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
