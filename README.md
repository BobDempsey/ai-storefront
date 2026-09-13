# AI Storefront

A Nuxt 4 storefront template with a shopping assistant, and a request-an-order
checkout: customers build a cart and submit it, staff receive the order by email
and arrange payment off-app.

## Stack

| Concern | Choice |
| --- | --- |
| Framework | Nuxt 4 (SSR) + Vue 3 + TypeScript |
| UI | PrimeVue 4.5.5 (Aura theme) + Tailwind CSS 4 |
| State | Pinia, persisted by `pinia-plugin-persistedstate` (cart to a cookie, theme to `localStorage`) |
| Data | Supabase (Postgres + RLS) |
| Email | Resend |
| Validation | Zod |
| Images | `@nuxt/image`, resized on demand (IPX locally, Vercel's optimizer on deploy) |
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
   npm test              # typecheck, then the unit tests, no network
   npm run typecheck     # types only
   npm run test:unit     # unit tests only, for the fast inner loop
   npm run test:e2e      # browser, needs a dev server (starts one if needed)
   npm run test:db       # writes to the live Supabase project
   npm run test:smoke    # checks the deployed site
   npm run test:llm      # real provider calls, the only script that costs money
   ```

   `npm test` typechecks the app, the server routes, the components and the
   tests before it runs a single assertion, so a type error fails the run the
   way a failing test does. It costs about 20 seconds against the unit tests'
   3, which is why `test:unit` exists for the loop you run on every save.

   The conventions behind that split are in [AGENTS.md](AGENTS.md).
   `test:smoke` defaults to this template's own demo at
   `ai-storefront.bobdempsey83.com`; set `SMOKE_BASE_URL` to check yours.

6. Lint:

   ```bash
   npm run lint          # ESLint, type-aware rules, about 17 seconds
   npm run check         # typecheck, lint and unit tests in one pass
   ```

   The lint sits outside `npm test` because together they ran 36 seconds, past
   the budget the change that added them set. Run `npm run check` before you
   push; run `npm test` while you work.

7. Continuous integration:

   `.github/workflows/check.yml` runs `npm run check` on a push to `main` and on
   every pull request. It runs nothing else on purpose. `test:db` and `test:llm`
   write to your live Supabase project and spend provider calls, and `test:e2e`
   and `test:smoke` need a running server or a deployment, so none of them
   belongs on a pull request from a fork. Fork this template and the workflow
   comes with it, needing no secrets.

## Database types

`server/types/database.ts` is generated from the live Supabase project and
committed, so every `.from(...)` and `.rpc(...)` call in `server/` is checked
against real columns. Regenerate it whenever you change `supabase/schema.sql`
and apply that change:

```bash
npm run db:types
```

The script needs `SUPABASE_ACCESS_TOKEN` in `.env`, a personal access token
from the Supabase dashboard, scoped to the project and read-only. It is read
only by this script: neither the build nor the running app touches it, so a
deployment does not need it.

A schema change without a regeneration shows up as types that disagree with the
SQL in the same diff. Nothing enforces the regeneration, so the typecheck is
only as current as the last run.

`products.kind` is a Postgres enum, so the generated row says
`'physical' | 'digital'` rather than `string`. The three file columns are not:
they are tied to the kind by a check constraint, and no Postgres type says
"non-null exactly when `kind` is `'digital'`", so the generator writes
`file_name: string | null` for both kinds. `server/utils/rows.ts` narrows them
back at the one point a row leaves a query.

If you convert another column to an enum, note what bit here: Postgres stores a
check constraint with its literal already cast, as `kind = 'digital'::text`, so
**every** constraint mentioning the column has to be dropped before the
conversion and added back after it. Missing one fails the migration with
`operator does not exist`.

## Running more than one shop from this repo

One build, many shops. Nothing in the code differs between them: the shop's
name, its origin, its share image and its database are all environment
variables, so a second shop is a second Vercel project on the same repo and the
same branch rather than a branch of its own.

This template runs two, which is what the checklist below was written from:
`ai-storefront.bobdempsey83.com` and `fif.bobdempsey83.com`.

1. **Give the shop its own Supabase project.** Run `supabase/schema.sql` then
   `supabase/seed.sql` against it. Two shops sharing one database means an order
   placed on either lands in the same table, and one forgotten `where` clause
   away from each other.
2. **Create a second Vercel project** from the same repo and branch. The Vercel
   MCP's `create_git_project` will not do this: it finds the existing project
   and hands that back. Use `vercel project add <name>` then
   `vercel git connect <repo url>`.
3. **Set every variable on Production and Preview**, with this shop's own
   values. `NUXT_PUBLIC_STORE_NAME`, `NUXT_PUBLIC_SITE_URL`,
   `NUXT_PUBLIC_OG_IMAGE` and the two Supabase ones are the per-shop ones.
4. **Render this shop's share image**, because the file has the shop's name
   drawn into it:

   ```bash
   node scripts/og-image.mjs --name "Your Shop" --domain your.example.com      --out public/og-image-your-shop.png
   ```

   Then point `NUXT_PUBLIC_OG_IMAGE` at it. Leaving it unset ships previews with
   no picture, which is deliberate: a preview showing another shop's name is
   worse than one showing none.
5. **Add the domain and its DNS record.** Vercel issues a per-domain CNAME
   target rather than `cname.vercel-dns.com`. Read it with
   `vercel domains verify <domain>` from a directory linked to the project;
   `vercel domains inspect` refuses a subdomain attached to a project.
6. **Redeploy**, because setting a variable does not rebuild what is running.
7. **Check it**: `SMOKE_SHOP=<name> npm run test:smoke`, after adding the shop
   to the list in `tests/smoke/production.test.ts`.

Two things that will cost you an afternoon otherwise. **Never pipe a secret into
`vercel env add`** from PowerShell: it prepends a UTF-8 BOM, Vercel stores it,
the build passes, and every request then fails at runtime with a character
65279 error. Write the value to a BOM-free file and redirect it instead. And
**never run `vercel deploy` from your working copy**: the CLI uploads a
directory rather than a git tree, so `.gitignore` does not protect `.env` and
your live credentials go up as build input. Deploy by pushing to your branch.

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

**Leave `NUXT_PUBLIC_DEPLOY_ENV` unset in production.** Name it on anything that
is not the live shop (`preview` on a preview deployment) and the storefront
carries a bar saying so, and puts it in the tab title too. Unset means the live
shop and renders nothing, so forgetting it is safe; typing it in production is
what you have to avoid. A dev server marks itself without the variable, because
`import.meta.dev` tells it. A preview cannot: its build is identical to
production's.

**Point the smoke test at your own domain.** `SMOKE_BASE_URL` overrides the
default in `tests/smoke/production.test.ts`. Give it the custom domain rather
than a per-deployment URL: those sit behind Vercel's deployment protection and
answer a login page, which the test would happily assert on while your store
was down.

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
