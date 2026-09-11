# Ecommerce Store Template

Nuxt 4 storefront with a request-an-order checkout: customers build a cart and
submit it, staff receive the order by email and arrange payment off-app.

## Stack

| Concern | Choice |
| --- | --- |
| Framework | Nuxt 4 (SSR) + Vue 3 + TypeScript |
| UI | PrimeVue 4.5.5 (Aura theme) + Tailwind CSS 4 |
| State | Pinia, persisted by `pinia-plugin-persistedstate` (cart to a cookie, theme to `localStorage`) |
| Data | Supabase (Postgres + RLS) |
| Email | Resend |
| Validation | Zod |
| Theming | Light/dark toggle in the navbar, applied before first paint |

## Setup

1. Install dependencies (npm needs `--legacy-peer-deps` on this Nuxt version):

   ```bash
   npm install --legacy-peer-deps
   ```

2. Create a Supabase project, then run `supabase/schema.sql` followed by
   `supabase/seed.sql` in the SQL editor.

3. Copy the env template and fill it in:

   ```bash
   cp .env.example .env
   ```

   One entry deserves a moment: `NUXT_TRUSTED_IP_HEADER` names the only header
   the rate limiter will believe about who is calling. A header the client can
   set is not an identity, so anything else is ignored. Use
   `x-vercel-forwarded-for` on Vercel (the default), `cf-connecting-ip` behind
   Cloudflare, `x-forwarded-for` behind your own nginx or Caddy, and leave it
   empty when Node faces the internet directly. Naming the wrong one costs you
   nothing worse than limiting every visitor as if they were the same person.

4. Start the dev server:

   ```bash
   npm run dev
   ```

5. Run the tests:

   ```bash
   npm test              # unit tests, no network
   npm run test:e2e      # browser, needs a dev server (starts one if needed)
   npm run test:db       # writes to the live Supabase project
   npm run test:smoke    # checks the deployed site
   npm run test:llm      # real provider calls, the only script that costs money
   ```

   The conventions behind that split are in [AGENTS.md](AGENTS.md).

## Before you take it live

The steps above give you a working shop on your machine. These four are what
separate that from a shop a stranger can buy from, and none of them is code: the
template cannot do them for you, because each one is about your shop, your
domain and your accounts.

**Name the shop.** `NUXT_PUBLIC_STORE_NAME` ships as `Store`, which is what the
header and the page titles will say until you change it. Along with the sandbox
sender address below, it is one of the two placeholders a customer can see.

**Buy a domain and verify it in Resend.** Until you do, the template sends
through Resend's sandbox sender (`onboarding@resend.dev`), and the sandbox
delivers to exactly one address: the one on your Resend account. That has two
consequences worth being clear about.

- Your own order notifications work, as long as `NUXT_ORDER_ADMIN_EMAIL` is that
  same address. Point it at a colleague and the mail silently goes nowhere.
- **Your customers receive nothing.** The order confirmation the buyer is
  promised is sent, refused, and logged. They are told to expect an email that
  cannot arrive.

So verify a domain in Resend before launch, then set `NUXT_ORDER_FROM_EMAIL` to
an address on it. Now both emails reach anyone.

**Add SPF and DKIM.** Resend gives you the DNS records when you verify the
domain. Skipping them does not stop mail going out, which is what makes it easy
to skip: it lands in spam instead, and you find out from the customer who says
they never heard back. Add the records, then send yourself a test order.

**Point `NUXT_TRUSTED_IP_HEADER` at your host.** Covered in step 3 above. It
defaults to Vercel's header; if you deploy elsewhere and leave it, every visitor
shares one rate-limit bucket.

### Deploying to Vercel

Import the repository, then set every variable from your `.env` on both
Production and Preview. Two things that cost an afternoon the first time:

- **A variable set to an empty string is not the same as an unset one.** Empty
  wins over the built-in default, so the app reports itself unconfigured while
  `vercel env ls` shows the variable present. It hides the values, so it cannot
  tell the two apart.
- **Adding a variable does not rebuild what is already deployed.** Run
  `vercel redeploy <url>` afterwards, or the running build never sees it.

Leave `NUXT_TEST_ORDER_TOKEN` unset in production. Unset means no request can
mark an order as a test, which is the setting you want on a real shop.

## Contributing with AI agents

This project uses [OpenSpec](https://github.com/Fission-AI/OpenSpec) for
spec-driven development: agree the spec before writing the code. See
[AGENTS.md](AGENTS.md) for the working agreement, and `openspec/` for specs and
in-flight changes.

```bash
npm install -g @fission-ai/openspec@latest   # requires Node 20.19+
```

In Claude Code: `/opsx:explore`, `/opsx:propose`, `/opsx:apply`, `/opsx:archive`.

## Order flow

1. Cart stores product IDs and quantities only — never prices.
2. `POST /api/cart/preview` resolves those IDs to current catalogue prices.
3. `POST /api/orders` validates the payload, rate-limits by IP, then calls the
   `create_order` Postgres function.
4. `create_order` prices the lines from the `products` table, rejects
   out-of-stock items and writes `orders` + `order_items` in one transaction.
5. Resend emails the order to staff with `reply-to` set to the customer, then
   sends the buyer their own confirmation. Neither send can fail the order,
   which is already committed by this point.
6. Staff read the order in the email or the Supabase dashboard.

## Security notes

- The Supabase **service role key is server-only**. It never reaches the browser
  and there is no anon key in the client bundle — all data goes through Nitro.
- RLS is enabled on every table. Only `products` is publicly readable.
- Prices and totals are computed in the database, so a tampered cart cannot
  change what is ordered.

## Phase 2 candidates

- Cloudflare Turnstile on the order form
- Admin order screen (Supabase dashboard covers MVP)
- Product variants and categories
- Real payments (Stripe Checkout via a Nitro route)
