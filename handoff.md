# Handoff

Everything needed to pick this project up cold. Written 2026-08-30, at the end
of the initial scaffold.

---

## 1. What this is

An ecommerce store **template** built as an MVP for a low-traffic, public-facing
storefront. Payment is deliberately **out of scope** — customers build a cart and
submit an order request; staff receive the order by email and arrange payment
off-app.

Project root: `C:\Users\bobde\Desktop\ecommerce-store`

Status: scaffold complete. `npm run build` succeeds and `npm run dev` serves
HTTP 200. **Nothing has been run against a real Supabase project yet** — the
storefront currently renders "Could not load products" because `.env` holds
placeholder credentials.

---

## 2. Stack, and why

| Concern | Choice | Reason it was chosen |
| --- | --- | --- |
| Framework | Nuxt 4 (SSR) | Catalog is public — needs SEO and fast product pages, which a pure Vue SPA can't give. Nitro server routes also remove the need for a separate backend. |
| UI | PrimeVue 5 + Tailwind CSS 4 | PrimeVue was a user requirement; it ships an official Nuxt module. Tailwind handles layout. |
| State | Pinia + `pinia-plugin-persistedstate` | Cart survives refresh via localStorage. |
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

---

## 3. Layout

```
nuxt.config.ts            modules, Tailwind vite plugin, PrimeVue theme, runtimeConfig
.env / .env.example       secrets (.env is gitignored)

supabase/
  schema.sql              tables, RLS policies, create_order() function
  seed.sql                4 demo products

server/
  utils/supabase.ts       memoized service-role client (bypasses RLS)
  utils/rate-limit.ts     in-memory fixed-window limiter
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
  types/index.ts                 Product, CartLine, CartPreview
  utils/money.ts                 formatMoney()
  assets/css/main.css            layer order + Tailwind import
```

---

## 4. Order flow (the core of the app)

1. Browser stores `{ productId, quantity }` in the Pinia cart — **never prices**.
2. `POST /api/cart/preview` resolves those IDs against the catalog and returns
   priced lines, a subtotal, and a `missing[]` of IDs no longer in the catalog
   (the cart page removes those automatically).
3. `POST /api/orders` rate-limits by IP (5 per 10 min), Zod-validates the body,
   merges duplicate lines, then calls the `create_order` Postgres RPC.
4. `create_order` (SECURITY DEFINER, one transaction) inserts the order, joins
   `products` to price each line and snapshot its name, raises
   `unavailable_item` if any line is missing or out of stock, then writes the
   total. **This is the single source of truth for pricing.**
5. The route re-reads the order + items and emails staff via Resend, with
   `reply-to` set to the customer. Email failure is logged, not surfaced — the
   order row is already committed and is the real record.
6. Client clears the cart and lands on `/order-received?id=<uuid>`.

---

## 5. Environment

`.env` currently holds placeholders. Real values needed:

```
NUXT_SUPABASE_URL           https://<project>.supabase.co
NUXT_SUPABASE_SERVICE_KEY   service_role key — SERVER ONLY, never expose
NUXT_RESEND_API_KEY         re_...
NUXT_ORDER_FROM_EMAIL       onboarding@resend.dev until a domain is verified
NUXT_ORDER_ADMIN_EMAIL      where staff receive orders
NUXT_PUBLIC_STORE_NAME      shown in the header
```

Nuxt maps these to `runtimeConfig` automatically via the `NUXT_` prefix.

---

## 6. Getting it running

```bash
npm install --legacy-peer-deps     # the flag is required, see gotchas
npm run dev                        # http://localhost:3000
```

Then, in the Supabase SQL editor: run `supabase/schema.sql`, then
`supabase/seed.sql`. Paste the project URL and service role key into `.env` and
restart the dev server. The homepage should show four demo products.

To test the email path end to end, note the Resend sandbox sender can only
deliver to the email address on the Resend account.

---

## 7. Gotchas discovered during setup

- **`npm install` fails without `--legacy-peer-deps`.** npm 10.9.3 throws
  `Cannot read properties of null (reading 'edgesOut')` (an arborist peer-set
  bug) while resolving Nuxt 4.5's dependency graph. Clearing the cache did not
  help. Switching to pnpm would also fix it if the user is open to that.
- **Node is v22.18.0; `undici@8.10.0` wants >=22.19.0.** Warning only, nothing
  has broken yet — but upgrade Node before blaming anything weird on the app.
- **PrimeVue 5 was installed, not 4.** `npm install primevue` resolved to v5 and
  `@primevue/nuxt-module` to v5. The README's stack table originally said
  PrimeVue 4; it has been corrected. Check v5 docs for component APIs.
- **Zod 4 is installed.** `z.string().email()` in `server/utils/schemas.ts` is
  the deprecated v3 spelling; v4 prefers `z.email()`. It still works today.
- **`ClientOnly` wraps cart-dependent UI.** The cart hydrates from localStorage
  after mount, so rendering it during SSR causes hydration mismatches. Keep that
  wrapper on anything reading `useCartStore()` state.
- **Tailwind/PrimeVue layer order** is set in two places that must stay in sync:
  `@layer theme, base, primevue, components, utilities;` in
  `app/assets/css/main.css`, and `cssLayer` in `nuxt.config.ts`.

---

## 8. Not done yet

Known gaps, roughly in the order they were prioritized with the user:

- **Supabase project does not exist.** Nothing has been executed against a real
  database — `create_order` is untested. Verify it before trusting it.
- **No tests of any kind.**
- **No SPF/DKIM**, because no domain. Admin mail will land in junk until the
  domain is bought and verified in Resend.
- **No customer confirmation email** — only staff are notified.
- **No admin order screen** — Supabase dashboard by decision.
- **No Turnstile/captcha** — phase 2.
- **No product variants or categories** — user confirmed phase 1 doesn't need
  them. The schema will need real work to add variants.
- **No stock decrementing.** `in_stock` is a manual boolean; ordering does not
  change it.
- **No deploy target chosen.** Vercel or Netlify were floated, nothing decided.
- **Not a git repo with commits** — `nuxi init` ran `--gitInit`, but no commit
  has been made.

---

## 9. Working style notes for the next agent

- The user prefers **one decision at a time** and pushed back on long
  recommendation lists. Ask, get an answer, move on.
- They asked what RLS and `fk` meant — do not assume deep Postgres background,
  and explain database terms briefly when they come up.
- They confirmed phase 1 scope explicitly; treat scope expansion as needing an
  ask, not an assumption.
