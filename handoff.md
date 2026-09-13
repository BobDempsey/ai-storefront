# Handoff

> **This is the `fif` branch: Forged in Filament, a real shop.** Everything below
> was written while this repo was the AI Storefront template and one demo, and
> it is kept because the shop is built from that template and inherits its
> decisions, its gotchas and its wiring. Read it as history that still mostly
> applies.
>
> What is different here, and will keep growing: this branch deploys
> `fif.bobdempsey83.com` from the Vercel project `forged-in-filament`, reads the
> Supabase project `wfhhkdmgouyxnrxnbaeo`, and `.mcp.json` points there rather
> than at the demo's. Template fixes arrive by cherry-pick from `main` when this
> shop wants them. This branch never merges back.
>
> Where this document and `main`'s copy disagree from here on, neither is wrong:
> they describe two different shops. Today the only difference is this banner:
> everything else has been kept level by cherry-pick, and that will stop being
> true as the shop diverges.
>
> **Resolving a cherry-pick conflict in this file, take care**: `git checkout
> --theirs handoff.md` takes `main`'s whole document, banner included, and the
> result claims to be `main`. It happened once already. Merge the conflicting
> hunk rather than the file.

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
--specs --strict` passed all 10 capabilities at the time; there are 13 now,
`ordering/test-order` having arrived with the test suite,
`ordering/customer-confirmation` with the buyer confirmation and
`storefront/deployment-banner` with the deployment work. That archive move
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
GitHub repo (then `ecommerce-store`, renamed to `ai-storefront` on 2026-09-11) and pushed
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

**This repository is a template, and is about to run two shops from one code
base** — the demo at `ai-storefront.bobdempsey83.com` and the real shop at
`fif.bobdempsey83.com`, each with its own Supabase project and environment
variables. Section 10 opens with that plan and the one open question in it.
Being a template is also how the remaining work was
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
still true the same day: 15 archived changes (17 now, the two navbar and
assistant changes described below having been archived since) and 12
capabilities with no
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

A fifth followed the same day, `add-assistant-attention-dot`: a small pulsing
dot on the navbar's assistant control, shown until the panel is opened in that
browsing session. **The same change removed the first-visit auto-open described
in the paragraph above**, at the user's direction, so the paragraph records what
shipped that morning rather than how the app behaves now. Nothing opens the
panel except the visitor; the dot is the only cue, and the reasoning is in
section 3. `assistant-greeted`, `autoOpenOnce()`, their tests and the seeded
Playwright `storageState` all went with it. A sessionStorage flag for the dot
went the same way shortly after, when the user settled that a refresh should
show the dot again: it is now plain store state, so the rebuild a page load
already does is what brings it back. Unit coverage went 180 to 194, then to 173
as the removals landed.

Verified against a running dev server and, for the removal, a genuinely clean
browser profile: a first-time visitor now gets the dot and a closed panel, with
no `assistant-greeted` written at all; clicking the control opens the panel and
clears the dot; it stays clear across a navigation and returns in a new session.
Driving a browser through the whole sequence: the dot shows on load, clears on
the click, stays clear when the panel is closed again and across an in-app
navigation, and is back after a reload. It is legible in both schemes, and under
emulated `prefers-reduced-motion: reduce` it stays at full opacity while the
pulse ring is gone. `npm test`, `npm run build` and `npm run test:e2e` all pass,
the e2e suite now without any seeding.

Verified on a running dev server at 1280px and 390px, in both schemes, that the
new homepage introduction (section 10) reads correctly and that its button
opens the assistant panel. `npm test` at 173, `npm run build` and
`npm run test:e2e` all pass, and the section is live at the domain with
`test:smoke` 4/4 after it.

Reviewed against the code again later on 2026-09-11, working tree clean at
`e72f94a` and `origin/main` level with local `main`. The rename is finished: the
**local folder is now `ai-storefront`** too, which section 10 still had as the
one piece outstanding, so nothing about the name is left to do. Two counts were
corrected in place, the archived-change count in the paragraph above (15, now
17) and the project root in section 1. Verified still true the same day: `npm
test` green at 173 across 13 files, 12 capabilities with no in-flight change,
`NUXT_PUBLIC_STORE_NAME` is "AI Storefront" in `.env` and still the `Store`
placeholder in `.env.example` and on Vercel, the smoke test still points at
`ecommerce-store-theta-sable.vercel.app`, and `aws sts get-caller-identity`
still fails with `InvalidClientTokenId` against a working 2.31.10 binary.

The same session then took the demo live on its own domain. The AWS CLI was
re-credentialled under a new scoped IAM user and
`https://ai-storefront.bobdempsey83.com` now serves the store over valid TLS,
with the smoke test pointed at it. Both are written up in section 10, which is
also where the surprises are: Vercel's per-domain CNAME target, and why
`vercel domains inspect` cannot read it.

A `resend` MCP server was added to `.mcp.json` the same day (`776202f`), the
hosted `https://mcp.resend.com/mcp` endpoint rather than the npx one, because
that file is tracked in a public repo and the stdio form wants `RESEND_API_KEY`
written into it. Like `supabase` it authorizes by OAuth per session. Using it
is what turned up the already-verified domain recorded in section 10.

The same session then gave the storefront a browser tab title and link
previews. Pages had been setting bare titles, so a tab read "Shop" with the
shop's name nowhere on it; a `titleTemplate` in `app/layouts/default.vue` now
renders "Shop · AI Storefront". It sits in the layout rather than
`nuxt.config.ts` on purpose: `storeName` is a runtime value, and a template in
the config would bake in whatever `NUXT_PUBLIC_STORE_NAME` held at build time,
so the second shop would ship the first shop's name in every tab. Open Graph
tags and a generated share image followed, with the new
`NUXT_PUBLIC_SITE_URL` behind them (sections 6 and 10). `npm test` is green at
173, `npm run build` passes, and `npm run test:smoke` passes against the
domain. `NUXT_PUBLIC_STORE_NAME` and `NUXT_PUBLIC_SITE_URL` were then set on
Vercel Production and `main` pushed at `5c761b2`, which Vercel built and
promoted; verified live at the domain: the tab reads "Shop · AI Storefront",
all nine share tags render with absolute URLs, `/og-image.png` answers 200, and
`test:smoke` is 4/4. That push also found **Preview holds no environment
variables at all**, which section 10 now records.

**The typecheck was not checking the tests.** Found on 2026-09-12 while applying
`deepen-typescript`, and it is the correction to the paragraph below: Nuxt's four
generated projects cover `app/`, `server/` and `shared/` and nothing else, so a
deliberate `const x: number = 'text'` in a test file passed the whole run. That
is also why the assistant tests' `as any` casts had never been questioned.
`tsconfig.tests.json` covers the suites and the root config files now, it is
referenced from `tsconfig.json`, and `npm run typecheck` runs both projects. It
found 43 errors in the suites on its first run, all fixed; one `!` on the three
fixture exports in `catalogue-stub.ts` accounted for 25 of them. An `any` had
survived the earlier change too: its grep was for `: any`, which does not match
the `Record<string, any>` on `present()` in `server/utils/assistant.ts`.

The same change gave the API **one declared shape per route**. They live in
`shared/types/api.ts`, which Nuxt 4 exposes to `app/` and `server/` alike, and
`app/types/index.ts` re-exports them so no app import changed. Each route now
annotates its return with the type its caller reads, which caught a real
mismatch on the first run: the quick search panel's `useFetch` default returned
`{ items: [], total: 0 }`, not a whole `CataloguePage`.

**The assistant's tool results are declared rather than derived, and the reason
is worth keeping.** The first version took `Awaited<ReturnType<typeof runTool>>`
and pulled each branch out with `Extract`, on the reasoning that a derived type
cannot drift. It drifts the worse way: rename a field inside the switch and
`Extract` matches nothing, so the branch becomes `never`, every test reading it
still compiles, and the check meant to catch the rename hides it. Verified by
renaming `subtotal` to `total` and watching the typecheck stay green. Declared
interfaces with `runTool` annotated now fail at the return statement instead.

**A hydration mismatch was live for as long as the tab strip was, and no test
could see it.** Every page load logged "Hydration completed but contains
mismatches". The cause was PrimeVue's `TabList`: it starts with
`isNextButtonEnabled` true and only corrects it in `updateButtonState()`, which
measures the rendered list and so cannot run on the server. SSR shipped a
scroll arrow the client removed on mount. `:show-navigators="false"` on the
`Tabs` is the fix, and two short labels never overflowed anything, so the arrows
had nothing to do here in the first place.

**The general lesson is worth more than the fix**: a component that measures the
DOM to decide what to render will disagree with the server every time, and the
page looks perfectly right while it does. The only symptom is in a console, so
`tests/e2e/console-clean.spec.ts` now fails the run on any console error or
warning across four pages, and separately pins the tab strip's node count on
both sides of hydration. Never add a hydration message to that file's ignore
list.

**Product photographs are resized on the fly**, through `@nuxt/image` and the
IPX provider, added 2026-09-12. The catalogue draws its 800x800 files at three
sizes and used to send the original for all of them, so the search panel pulled
about 800KB to paint eight 36px thumbnails. A card photo is 70KB now and a
thumbnail 1KB. IPX resizes on the server at request time and caches, so there
is still no build step and no external image host, which is the promise section
1 makes about the catalogue. Every `NuxtImg` states its intrinsic width and
height so a card cannot jump while the photo lands.

**In production it is not IPX at all.** Nuxt's Vercel preset swaps the provider
on deploy, so a live card's `src` reads
`/_vercel/image?url=%2Fimages%2F...&w=640&q=80` while the same page locally
reads `/_ipx/q_80&s_640x640/...`. Both honour the same `NuxtImg` props, so
nothing in the templates cares, but two things follow: Vercel's optimizer has
its own per-plan transformation quota, and a bug that only appears at one of
the two will not reproduce at the other. Check which provider is answering
before chasing an image problem.

**The README and `AGENTS.md` both claimed `products.kind` comes back as
`string`**, which the enum had made false, and both said `server/utils/rows.ts`
goes away with it, which it does not: the three file columns are tied to the
kind by a check constraint and no Postgres type expresses conditional
nullability, so that half of the file stays. Corrected 2026-09-12, along with
adding `@nuxt/image` to the README's stack table and a CI step to its setup.
Worth a look whenever this document records a change: the two files an adopter
reads go stale from the same edits, and neither is covered by a test.

**There is a CI now, and it is green.** `.github/workflows/check.yml` runs
`npm ci --legacy-peer-deps` then `npm run check` on a push to `main` and on
every pull request, and deliberately runs nothing else: `test:db` and
`test:llm` write to the live project and spend provider calls, and `test:e2e`
and `test:smoke` need a server or a deployment, so none of them belongs on a
pull request from a fork. First run 2026-09-12, passing in 58 seconds. **One
annotation to clear when someone next touches the file**: `actions/checkout@v4`
and `actions/setup-node@v4` target a deprecated Node 20 and are being forced
onto 24, which `@v5` on both would settle.

**ESLint is in, with type-aware rules, and it is not in `npm test`.** The full
run reached 36 seconds against 20 without it, past the threshold the design set,
so `npm test` keeps the typecheck and the tests, `npm run lint` runs the linter,
and `npm run check` runs everything. It earned itself immediately: 10 floating
promises in the app, all navigations and refreshes nobody awaited. Two rules are
off with reasons - `require-await` in the test stubs, which must be async to
stub an async API, and `vue/no-multiple-template-root`, which is the Vue 2 shape
of the world. ~~23 warnings remain and they are all one problem.~~ **Closed
2026-09-12**: they were all the bare `SupabaseClient`, and generating `Database`
silenced every one of them. The `no-unsafe-*` rules are back to `error` for
`server/**` and `app/stores/**`, and `npm run lint` is 0 errors and 0 warnings.

**The database types are generated, 2026-09-12.** A read-only Supabase personal
access token scoped to the one project settled the decision this document had
recorded as blocking. `npm run db:types` writes `server/types/database.ts`, 401
lines over seven tables plus `create_order`, and two runs produce the same file.
It goes through `scripts/db-types.mjs` rather than a bare CLI line in
`package.json`, and the reason is worth knowing: **npm does not load `.env`**, so
the Supabase CLI would never have seen the token. The script reads it out of
`.env` itself. `supabase` is a devDependency now so the script does not run
whatever `npx` happens to fetch. Verified the app still starts with the token
removed, which it must, since nothing at build or run time reads it.

**Typing the client found one real bug and three gaps, and the gaps are the
schema's.** `server/api/products/[slug].get.ts` was passing
`getRouterParam(event, 'slug')`, a `string | undefined`, straight into
`.eq('slug', slug)`; it 404s on a missing slug now. The three gaps are all
`products.kind` being `text` with a check constraint rather than a Postgres
enum, so every generated row says `kind: string` and the file columns are
nullable for both kinds. `server/utils/rows.ts` is new and narrows those values
back at the one point a row leaves a query, by checking rather than casting.

**`kind` became a real enum on 2026-09-12** and closed the first of those gaps
at the source. `public.product_kind` holds the two values, `products_kind_check`
is gone, and the generated row reads `kind: 'physical' | 'digital'` on its own,
so `productKind()` and `withProductKind()` were deleted. The conversion had one
wrinkle the plan missed: `products_file_fields_check` and
`products_digital_in_stock_check` also mention `kind`, and Postgres stores them
with the literal cast to `text`, so rebuilding them against an enum column fails
with "operator does not exist: product_kind = text". Both come off before the
conversion and go back on after it. `withProductFiles()` survives, because no
Postgres type expresses "these three columns are non-null exactly when `kind` is
'digital'", so the generated types still say `string | null` for all three. One more to know before editing the orders route:
**`supabase gen types` writes a defaulted function argument as optional, never
nullable**, so `create_order`'s `p_promo_code text default null` rejected the
explicit `p_promo_code: null` the route used to pass. The call omits the key.

**The typed client is verified against the live project and a browser**, later
the same day: `test:db` 46/46 and `test:e2e` 28/28, alongside `npm test` at 236,
a clean `npm run build` and lint at zero. The `orders` table holds no `is_test`
row afterwards, so the suites cleaned up after themselves. Nothing a visitor
sees changed.

`deepen-typescript` is **24 of 24**, archived, and its last three tasks were
finished after the archive rather than reopened; both measurements are written
up at the end of that folder's `notes.md`. `typed-client-errors.md` beside it
holds the five errors the typed client raised, recorded before any were fixed.

**`noUncheckedIndexedAccess` is on, and it cost nothing.** It sits in
`nuxt.config.ts` under `typescript.tsConfig`, which is what reaches all four
generated projects, and again in `tsconfig.tests.json`, which Nuxt does not
generate. The full typecheck reported **zero errors** with it on. Zero is a
suspicious number for that flag, so it was proved rather than trusted: a
throwaway file reading `xs[0].length` off a `string[]` raised `TS18048` in all
three projects. The flag bites. This code just does not index into arrays or
records without checking first.

**The provider suite passes against the typed chat loop**: `npm run test:llm`
is 8/8 in 49 seconds, 8 calls, 9 with `test:e2e:llm`, against the ceiling of
ten. That is the one thing neither the typecheck nor the build could tell us,
since a typed tool loop that never gets called still compiles.

**The repo typechecks now**, through the OpenSpec change `enforce-typescript`:
`npm test` runs `vue-tsc` before a single assertion, so a type error fails the
run the way a failing test does, and `npm run test:unit` stays for the fast
loop. It costs about 13 seconds against the unit tests' 3. What the first run
found is the part worth reading, because none of it was the six `any` escapes
the change was written around, and the notes are in the archived change as
`first-run-errors.txt`. **TypeScript 7 is not usable here yet**: `npm i -D
typescript` installs 7.0.2, whose exports no longer carry `./lib/tsc`, and
`vue-tsc@3` resolves exactly that path, so the dependency is pinned to `^5.9.0`.
**`app/stores/color-mode.ts` had never been typed at all**: its `persist`
serializer narrowed a parameter the plugin types as the whole state tree, so
`defineStore` fell through to its setup-store overload and every getter and
action vanished from the type, taking nine of the twelve errors with it,
including five in `default.vue`. The store worked; nothing had ever checked it.
And `@types/node` had never been a dependency, so `node:crypto` had no types.

The six `any`s themselves are gone: five `catch (error: any)` handlers now catch
`unknown` and go through `app/utils/errors.ts`, which narrows once rather than
casting five times, and the assistant's message array takes the OpenAI SDK's own
union. **`messageFor` reads both `statusMessage` and `data.statusMessage`**,
which are not the same place: the first is what a thrown `createError` carries,
the second is where the same text lands after `$fetch` parses it, and a handler
reading only one shows "Something went wrong" for half the failures it could
have explained. Unit coverage went 225 to 236. `npm test`, `npm run build`,
`npm run test:e2e` and `npm run test:db` all pass; **`npm run test:llm` was not
run**, since it spends provider calls, so the typed chat loop is verified by the
checker and the build rather than against the real provider. That run is the
first item under the new "Getting more out of TypeScript" heading in `tasks.md`,
which also holds what this change deliberately left out: typed route responses,
the tests' own `as any` casts, ESLint, `noUncheckedIndexedAccess` and a CI to
run the check in.

~~**The biggest gap left is the database.**~~ **Closed 2026-09-12**, see above.
What it said, kept because it is why the work was done: `useSupabase()` in
`server/utils/supabase.ts` returned a bare `SupabaseClient` with no `Database`
generic, and no generated types existed: `supabase/` held `schema.sql` and
`seed.sql` and nothing else. So every `.from('products').select(...)` in the
repo was checked against nothing, and a renamed column was a runtime bug that
reaches a visitor rather than a type error that stops a build. Closing it meant
generating types from the schema and passing them to `createClient<Database>`,
which is the first real item on that list after the `test:llm` run.

Reviewed against the code again on 2026-09-12, working tree clean at `21ad6a9`.
Two finds matter. **`origin/main` is 12 commits behind local `main`**, so
everything from the catalogue search onward — search, pagination, the six new
products, the typecheck, the route types and ESLint — is committed and none of
it is live; the last push was `8289dd0` (section 10). And **three changes sit
complete and unarchived**, every task ticked: `add-catalogue-search` at 21/21,
`add-catalogue-pagination` at 18/18 and `enforce-typescript` at 16/16. Six
smaller claims were corrected in place: the capability count in the paragraph
above, the catalogue row count in section 1, the seed and image counts in
section 4's tree, and the `npm test` and `test:db` counts in section 10.
Verified still true the same day: 21 archived changes, 13 capabilities,
`npm test` green at 236 across 18 files, `npx eslint .` at 23 warnings and 0
errors, and `deepen-typescript` the only genuinely in-flight change. All three
numbers moved by the end of that day: 25 archived changes, 15 capabilities and
lint at zero.

Two agents then ran in parallel on 2026-09-12, one on the database types above
and one on the product photographs below, and both landed. Every suite in the repo is
green: `npm run check` (the typecheck, the linter and 236 tests), `npm run
build`, `test:db` 46/46, `test:e2e` 28/28 and `test:llm` 8/8.

Three things were settled on 2026-09-11 and should not be reopened without
asking. **No rename**: the project keeps `ai-storefront` and the assistant keeps
"AI Shop Assistant", since the last rename had only just finished across the
repo, the Vercel project, the local folder and the live domain. **The
assistant's six-second reply is accepted**, so the faster-provider and streaming
idea is dropped rather than parked; `cap-assistant-reasoning-effort` already took
it from 29 seconds, and the panel says it is working while the visitor waits.
And **the shop field names its shortcut**, reading "Search the shop (Ctrl+K)" at
a smaller placeholder size, where the quick search panel's own field says only
"Search the shop" because naming the shortcut that opened it would be noise.

~~The six new products still carry placeholder images.~~ **All six are real
photographs as of 2026-09-12**, once a free Pexels key arrived
(`PEXELS_API_KEY` in `.env`, section 6). `headphone-stand`,
`monitor-riser-shelf`, `pen-and-tool-cup`, `phone-dock-charging`,
`seed-starter-tray` and `cable-clip-set` are Pexels images now, all 800x800 to
match the original six, 21KB to 182KB. The Pexels licence asks for no attribution, and none was
added, since the original six carry none either.

**`cable-clip-set` carries a deliberately approximate image**, settled with the
user on 2026-09-12 after a first pass left the placeholder rather than ship a
bad match. Pexels holds no photograph of a cable clip set: thirteen queries
returned office binder clips or tangled cables on utility poles, and the one
near miss, photo 20213730, is too dark to read once cropped square. The user
then asked for an approximate image instead, so the file now shows a white
cable coiled on white, which illustrates the tidy outcome rather than the
clips. It matches `desk-cable-organizer`'s treatment, so the two sit together
on a grid.

**Two judgement calls to check before the shop goes in front of a customer**,
both honest but both wrong in a small way. `cable-clip-set`'s cable ends in an
obsolete 30-pin Apple dock connector, which dates the photograph to anyone who
looks closely. And `monitor-riser-shelf` is a laptop on a riser rather than a
monitor on one, the right job but the wrong object. Either can be reverted.
Neither has a better Pexels option; fixing them properly means a different
source or a commissioned shot.

For context on why the key mattered: Openverse, the keyless free-image API, was
tried first and is not usable for these. It answered a headphone stand with a
1940s radio operator, a phone dock with the Nuremberg trials and a seed tray
with bread loaves, and the two genuinely relevant results were CC-BY rather than
attribution-free. The lesson that carried over is to **look at the image rather
than trust the API's alt text**, which is how the duds get filtered out.

Pagination followed the same day, through the OpenSpec change
`add-catalogue-pagination`: six items a page, each tab paging on its own.
**The response shape of `/api/products` changed** from a bare array to
`{ items, total, page, perPage }`, because a total is what the controls and the
per-tab counts both need and an array cannot carry one; every consumer is in
this repo and moved in the same commit, `tests/smoke/production.test.ts`
included. Four decisions worth knowing. **Each kind fetches its own page**, so
the request takes `kind` and the two tabs cannot share a page number that would
put one of them past its end. **Paging uses `push` where searching uses
`replace`**: a page change is a deliberate step Back should undo, and typing is
not. **Changing the term resets both page numbers in the same URL write**, not
in a watcher afterwards, which would flash the old page and leave a useless
history entry. And **a page past the end is an empty page, not an error**:
PostgREST answers a range past the end with its own 416, so the route catches
that one code and re-counts, or a stale link would reach a visitor as a broken
shop. The controls are PrimeVue's `Paginator`, which already collapses to arrows
and a current page at 390px; measured there at 309px wide with 40px targets and
no sideways scroll.

**The catalogue is twelve printed goods now, not six.** Six more were seeded so
pagination is visible rather than theoretical, written to both `supabase/seed.sql`
and the live `products` rows, the same two places the description rewrite needed.
They carried **generated placeholder images** rather than photographs, made
headlessly through the repo's own Playwright the way `og-image.png` was; replacing
`public/images/<slug>.jpg` needs no code change, which is how five of them became
Pexels photographs on 2026-09-12 with no redeploy of anything but the files. Unit coverage went 219 to 225,
`test:db` 40 to 46 and the e2e suite 20 to 28. Verified against a running dev
server: page two holds six different items, Back returns to page one, a reload of
`?page=2` reproduces it, paging the products leaves the files tab where it was,
searching from page two lands on the first page of the results, and an order
placed from page two priced correctly at the sale ($21.00 to $16.80) and was
deleted afterwards. `npm test`, `npm run build`, `npm run test:e2e` and
`npm run test:db` all pass.

Catalogue search followed on 2026-09-11, through the OpenSpec change
`add-catalogue-search`: a magnifier in the navbar and a field beside the `Shop`
heading, filtering both tabs as the visitor types. Three decisions are worth
reading before touching it. **The filtering happens in the database**, through a
`q` on `/api/products` and a PostgREST `or=(name.ilike,description.ilike)`,
rather than over the array the page already holds: a client filter can only
search the rows on the page, which is wrong the moment pagination lands, and
pagination is the next task. **The URL is the state** — the field, the fetch, a
reload and a shared link all read `route.query.q` — and it is written with
`router.replace` on a 250ms debounce, so ten keystrokes are not ten history
entries and one Back leaves the page instead of walking back through the
letters. **The matching rule moved into `server/utils/search.ts`** and the
assistant's `search_catalogue` now calls it, so the shop page and the assistant
cannot answer differently for the same words; the rule itself is unchanged, a
case-insensitive substring of the name or the description, and `%` and `_` are
escaped so a search for "50%" is not a wildcard. The navbar control is a link to
`/?focus=search` rather than a second input, because two boxes for one term
disagree the moment one goes stale; the parameter is stripped once focus lands.
**The catalogue page's own field is a launcher now, not a second search box**,
changed 2026-09-12 through the OpenSpec change
`open-panel-from-catalogue-field`, which modifies an accepted requirement rather
than adding one. Clicking or tabbing to it opens the same panel the navbar
opens, carrying whatever term the page is filtered by so the visitor continues
instead of starting again. It is `readonly`, which is what stops a keystroke
landing behind the open dialog and splitting one term across two boxes, and it
still shows the active term so a shared link reads back.

Three things to know before editing it. **The panel is seeded at creation, not
by a watcher**: the layout renders it with `v-if="palette.open"`, so it does not
exist until the flag is already true and a watcher on that flag never fires. The
first attempt used one and opened the panel empty every time. **Back changed
meaning**: taking a term to the shop page pushes, the way paging does, so one
Back returns to the unsearched catalogue and a second leaves it. That is still
one history entry for a whole search rather than one per keystroke, which is
what the rule was always about. And **"see all" reads the field, not the
debounced term**, because a visitor who types and clicks straight through was
being sent to an unsearched catalogue; the symptom was an end-to-end failure
that moved between tests on each run, which is what a race looks like from the
outside.

The navbar's magnifier opens a **quick search panel** rather than sending the
visitor to the shop page, decided with the user after the first version shipped:
it opens over whatever page they are on, lists the catalogue before a key is
pressed, narrows as they type, and offers a row that carries the term to the
shop page for the full results. Listing up front is the point, since a panel
that opens empty asks a visitor to guess what the shop stocks. It is keyboard
operable throughout, arrows and Enter and Escape, with Ctrl+K as the shortcut,
and the field keeps focus while the highlight moves so typing never stops. The
panel is `app/components/SearchPalette.vue` with its open state in
`app/stores/search-palette.ts`; it reads the same `/api/products?q=` the shop
page does, so the two cannot disagree. One thing worth knowing before editing
the shop page's own field: the browser draws its own clear control inside a
`type="search"` box, which showed two crosses side by side until a scoped style
suppressed it. Unit coverage went 198 to 219, the e2e suite 9 tests to 20 and
`test:db` 33 to 40, all still free of a provider call. Verified against a running dev server
through the `playwright` MCP server: the navbar control focuses the field from a
product page, typing narrows to two dragons with per-tab counts of 1 and 1,
clearing restores all nine and leaves a plain address, a reloaded `?q=planter`
reproduces itself, one Back from a four-letter search lands on the product page,
and the cart is untouched across all of it. Read correctly at 1280px and 390px
in both schemes. `npm test`, `npm run build`, `npm run test:e2e` and
`npm run test:db` all pass.

Reviewed against the code again on 2026-09-11, working tree clean at `be36082`.
The four changes that had shipped since the last review were sitting complete
and unarchived, all their tasks ticked: `ask-assistant-about-a-product`,
`cap-assistant-reasoning-effort`, `mark-non-production-deployments` and
`mark-non-production-orders-as-tests`. All four are archived now, their delta
specs synced into the main tree, which gained a thirteenth capability,
`storefront/deployment-banner`, and folded the rest into
`specs/assistant/shopping-assistant/` and `specs/ordering/test-order/`.
`openspec validate --specs --strict` passes 13 of 13 and `npm test` is green at
198. That archive move is committed as `8289dd0`, and `main` was pushed the
same session, which Vercel built and promoted; the seven commits are live
(section 10). Five stale claims were corrected in place: the change count and table in
section 2 and that section's `.mcp.json` and spec-coverage lines,
`app/utils/deploy-env.ts` missing from section 4's tree,
`NUXT_TRUSTED_IP_HEADER` listed in section 6 as a `.env` entry when it is the
default in `nuxt.config.ts`, and the unit-test count in section 10. The find
that matters, found and then closed in the same session: `origin/main` had
fallen six commits behind local `main`, so the prefill, the latency work and
both deployment changes were committed and none of them was live. They are
live now.

---

## 1. What this is

An ecommerce store **template** built as an MVP for a low-traffic, public-facing
storefront. Payment is deliberately **out of scope** — customers build a cart and
submit an order request; staff receive the order by email and arrange payment
off-app.

Project root: `C:\Users\bobde\Desktop\ai-storefront`

Status: **the storefront is live against a real database.** A Supabase project
(`forged in filament`, ref `wfhhkdmgouyxnrxnbaeo`) exists, the schema and seed
have been run, and `/api/products` returns all 15 catalogue rows (12 physical,
3 digital) with no `kind` filter — the storefront splits them into tabs by
`kind` and pages each tab six at a time. `create_order` has been executed against the real database and
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
                          server added 2026-09-03 and the hosted resend server
                          added 2026-09-11. See AGENTS.md
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

Twenty-seven changes have been through the full cycle, all in
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
| `2026-09-11-refresh-navbar-and-assistant-entry` | additions folded into `specs/assistant/shopping-assistant/` and `specs/theming/color-mode/` |
| `2026-09-11-add-assistant-attention-dot` | additions folded into `specs/assistant/shopping-assistant/`, which also lost the first-visit auto-open that change had added hours earlier |
| `2026-09-11-ask-assistant-about-a-product` | additions folded into `specs/assistant/shopping-assistant/` |
| `2026-09-11-cap-assistant-reasoning-effort` | additions folded into `specs/assistant/shopping-assistant/` |
| `2026-09-11-mark-non-production-deployments` | `specs/storefront/deployment-banner/` |
| `2026-09-11-mark-non-production-orders-as-tests` | additions folded into `specs/ordering/test-order/` |
| `2026-09-12-add-catalogue-search` | `specs/catalog/catalogue-search/` |
| `2026-09-12-add-catalogue-pagination` | `specs/catalog/catalogue-pagination/` |
| `2026-09-12-enforce-typescript` | none — it typechecks the repo, and changed no behaviour to spec |
| `2026-09-12-deepen-typescript` | none — same, and archived with 3 optional tasks open |
| `2026-09-12-type-product-kind` | none — `skip_specs`: the two kinds and every rule about them are unchanged, only where the rule is enforced |
| `2026-09-12-open-panel-from-catalogue-field` | modifications folded into `specs/catalog/catalogue-search/`, the first change here to rewrite an accepted requirement rather than add one |

Read the dark-mode pair first to see the expected shape of a proposal, design,
tasks and spec.

All four were archived later on 2026-09-12, and `openspec/changes/` holds
nothing but `archive/`. The two catalogue changes brought new capabilities,
`catalog/catalogue-search` and `catalog/catalogue-pagination`, taking the tree
to fifteen. The two typing changes brought none: they added no behaviour a spec
describes. `deepen-typescript` was archived at 21 of 24, with the
`noUncheckedIndexedAccess` measurement and one `test:llm` run left as optional
follow-ups rather than unfinished work. `openspec validate --specs --strict`
passes 15 of 15.

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

Specs cover theming, contact, five ordering capabilities, the catalogue's
file products and store-wide sale, the shopping assistant, the newsletter,
promo codes, the deployment banner and the catalogue's search and pagination:
fifteen capabilities as of 2026-09-12. `catalog/catalogue-search` is the one
whose accepted text has been rewritten rather than extended, when the catalogue
page's field became a launcher; the requirement it replaced described a field
that filtered in place. Everything else in this document predates OpenSpec and is not
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
- **Nothing opens the assistant panel except the visitor.** A first-visit
  auto-open was built on 2026-09-11 and removed the same day, at the user's
  direction, in favour of the attention dot below. Do not rebuild it, or a
  delayed, scrolled or exit-intent version of it, without asking. The reason it
  went is worth keeping: it fired once per browser, so it could never reach a
  returning visitor who had closed the panel, and it opened over the page of
  someone who had asked for nothing. It also cannot coexist with the dot, which
  it would clear in the same tick a first-time visitor loaded the page, spending
  the cue before it was seen. `tests/unit/assistant-dot.test.ts` pins the store
  as having no such action, so putting one back is a deliberate edit.
- **The navbar's attention dot is the only thing pointing at the assistant, and
  it is stored nowhere.** `showDot` is plain state on the assistant store,
  defaulting to true and cleared by `openDrawer`. That default is the whole
  mechanism: the store is rebuilt on every page load, so a reload brings the dot
  back, while an in-app navigation does not, because client-side routing does
  not rebuild the store. A sessionStorage flag was built for this first and
  removed on the user's call that a refresh should show the dot again; storing
  nothing is both the simpler code and the asked-for behaviour, so do not
  reintroduce a flag without asking. Reduced motion stops the pulse and keeps
  the dot, rather than hiding it.
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
  seed.sql                12 physical products and 3 downloadable files

server/
  utils/supabase.ts       memoized service-role client (bypasses RLS), typed
                          SupabaseClient<Database> since 2026-09-12
  types/database.ts       generated, do not hand-edit. `npm run db:types`
  utils/rows.ts           withProductFiles(), which ties the three file columns
                          to the kind. The schema's check constraint guarantees
                          that and the generated types cannot express it
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
  components/SearchPalette.vue   the quick search panel. Mounted by a v-if, so
                                 it reads the store's seed at creation
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
  types/index.ts                 re-exports shared/types/api.ts, so no app
                                 import had to change when the shapes moved
  utils/errors.ts                messageFor(), the one place an unknown caught
                                 error becomes a sentence. Reads statusMessage
                                 and data.statusMessage, which are two places
  utils/deploy-env.ts            deployEnvLabel(), the one place that decides
                                 whether a deployment calls itself something
                                 other than the live shop
  utils/money.ts                 formatMoney()
  utils/bytes.ts                 formatBytes(), for file sizes
  assets/css/main.css            layer order + Tailwind import

public/
  images/                   12 images, <slug>.jpg. The first 6 are free-licensed
                            Pexels photographs; the 6 added with pagination are
                            generated placeholders (section 10)
  og-image.png              the share image, "AI Storefront" rendered into it

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

shared/
  types/api.ts              one declared response shape per API route. Nuxt 4
                            exposes shared/ to app/ and server/ alike, which is
                            why this is the one place both sides can agree

Also present, not listed above: README.md, package.json, tsconfig.json,
tsconfig.tests.json (the suites and the root config files, which Nuxt's own
generated projects do not cover), eslint.config.mjs,
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
It is not a credential, so it is safe to commit, and it stays the sandbox
address in the example even though `.env` has moved off it, because an adopter
has no verified domain on their first run.

```
NUXT_SUPABASE_URL           SET — https://wfhhkdmgouyxnrxnbaeo.supabase.co
                            locally and for the real shop. The demo's Vercel
                            project points at qtzwrwstixqgnuixfajp as of
                            2026-09-12: one variable, two values, which is the
                            whole mechanism separating the shops
SUPABASE_PROJECT_REF        NOT SET, and optional — read by scripts/db-types.mjs
                            only, to say which project to generate types from.
                            Unset means the real shop. The token cannot reach
                            the demo's project yet, so setting it fails today
NUXT_SUPABASE_SERVICE_KEY   SET — an sb_secret_... key. SERVER ONLY, never expose
NUXT_RESEND_API_KEY         SET — a real re_... key, verified sending
NUXT_ORDER_FROM_EMAIL       orders@bobdempsey83.com as of 2026-09-11, locally
                            and on both Vercel environments. Nothing receives
                            there and nothing needs to: the domain is verified
                            in Resend, which is all sending requires, and a
                            buyer's Reply goes to the reply-to instead. The
                            sandbox `onboarding@resend.dev` it replaced is what
                            had been holding back every delivery
NUXT_ORDER_ADMIN_EMAIL      SET — the owner's address, which is also the Resend
                            account address. The sandbox sender will not deliver
                            anywhere else until a domain is verified
NUXT_OPENAI_API_KEY         SET — a real sk-proj... key, powers the assistant.
                            SERVER ONLY. Blank it and the drawer reports the
                            assistant unavailable; nothing else changes
NUXT_PUBLIC_STORE_NAME      SET — "AI Storefront" as of 2026-09-11, locally and
                            on Vercel Production. The placeholder is gone
NUXT_PUBLIC_OG_IMAGE        NOT in `.env`; SET on the demo's Vercel Production
                            and Preview as /og-image.png, 2026-09-12. A path
                            under public/ with a leading slash and no origin.
                            Per deployment, because the image carries the shop's
                            name. Unset omits the share tags rather than serving
                            another shop's picture, which is the default and is
                            deliberate
NUXT_PUBLIC_SITE_URL        SET — https://ai-storefront.bobdempsey83.com, no
                            trailing slash, locally and on Vercel Production.
                            The origin the share tags build an absolute image
                            URL from; an unset one omits the share image rather
                            than emitting a relative path every consumer drops
NUXT_PUBLIC_DEPLOY_ENV      development in `.env`, preview on Vercel Preview,
                            deliberately UNSET on Production. Names a deployment
                            that is not the live shop, which then carries an
                            amber bar and a tab-title prefix. Unset and
                            "production" both render nothing, so the live shop
                            is the case that needs no configuration
NUXT_TRUSTED_IP_HEADER      x-vercel-forwarded-for — the only header the rate
                            limiter believes about who is calling. Not a secret.
                            NOT in `.env`: that value is the default in
                            `nuxt.config.ts`, and `.env.example` carries it.
                            Set it to your host's header if you leave Vercel;
                            empty means the connection address alone
SUPABASE_ACCESS_TOKEN       SET locally — an sbp_... personal access token,
                            read-only and scoped to this one project. No NUXT_
                            prefix on purpose: nothing at build or run time
                            reads it. Only `npm run db:types` does. NOT on
                            Vercel and it must not be
PEXELS_API_KEY              SET locally — free key from pexels.com/api. Same
                            shape: no NUXT_ prefix, used only to fetch product
                            photographs into public/images/, not on Vercel
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
- **PrimeVue components carry padding the markup does not show.** The catalogue
  cards were too narrow on a phone because three layers of horizontal padding
  stacked up: `<main>`'s `px-4` page gutter, the section's `p-6`, and 18px of
  PrimeVue's own `.p-tabpanels`. That third layer is the one that wastes an
  afternoon, because reading `index.vue` accounts for only two of them. Measure
  the chain in the browser rather than adding up the classes. Fixed 2026-09-11
  by dropping the two inner layers below `sm` (`p-4 sm:p-6` on the section,
  `!px-0 sm:!px-[18px]` on `TabPanels`), which took a card at 390px from 272px
  to 324px and left every breakpoint from `sm` up measuring exactly as before.
  The page gutter stays at 16px on purpose: that one is the margin of the page,
  not wasted space.
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
- **A clean Playwright context looks exactly like a first-time visitor.** While
  the panel had a first-visit auto-open, every e2e test started from a context
  with no flag set, so the panel opened over the catalogue and swallowed the
  "Add to cart" click. The symptom was a detached-element timeout three steps
  later, which reads like the stale-dev-server hydration failure above rather
  than like the feature that caused it. The workaround was a seeded
  `storageState`, and both it and the auto-open are gone as of 2026-09-11. The
  lesson is not: anything this app comes to do unprompted on a first visit will
  break the suite the same way, and will point somewhere else when it does.
- **A second dev server needs `NUXT_IGNORE_LOCK=1`.** The Windows dev-lock
  gotcha above refuses a second `npm run dev` outright. To check behaviour with
  an environment variable changed, start one with `NUXT_IGNORE_LOCK=1
  NUXT_PORT=3100` and the variable set on that command, rather than editing
  `.env`, which loses the real credential the moment the run is killed.
  `tests/db/chat-guards.test.ts` does exactly this and is the worked example.
- **`vercel deploy` from the repo directory uploads `.env`.** Found 2026-09-12
  while standing up the second shop: `vercel deploy --dry` listed `.env`,
  `.env.local` and `.env.example` among the files it would send. `.gitignore`
  does not stop it, because the CLI uploads a working directory rather than a
  git tree. Every live credential this project holds would have gone to Vercel
  as build input. The way round it, if a CLI deploy is ever needed, is to deploy
  from a clean `git clone` of `main` with `.git` removed, which carries only
  `.env.example`. **The ordinary path does not have this problem**: a push to
  `main` builds from GitHub, where `.env` was never committed. Do not run
  `vercel deploy` in this repo.
- **Never pipe a secret into `vercel env add` from PowerShell.**
  `Get-Clipboard | vercel env add NAME production` prepends a UTF-8 BOM and
  Vercel stores it. The build succeeds, `vercel env ls` looks perfect, and every
  request then dies at runtime with `Cannot convert argument to a ByteString
  because the character at index 0 has a value of 65279`, which surfaces as a
  502 from `/api/products`. It cost the demo a few minutes of downtime on
  2026-09-12. Write the value to a file with no BOM, check it with
  `od -c value.txt | head -1`, and redirect:
  `npx vercel env add NAME production < value.txt`. This is the empty-string
  trap's cousin: both make a variable that is present, wrong, and invisible.
- **A component rendered with `v-if` cannot watch the flag that renders it.**
  `SearchPalette.vue` is mounted by `v-if="palette.open"` in the layout, so by
  the time its setup runs the flag is already true and a `watch` on it never
  sees a transition. Anything the panel needs from the store at open time has to
  be read at creation instead. Cost an hour on 2026-09-12: the panel opened
  empty and every obvious suspect, the store, the event, the focus handler, was
  innocent.
- **A debounced ref is the wrong thing for a button to read.** The search panel
  holds `typed` and a `term` 200ms behind it. "See all" read `term`, so a
  visitor who typed and clicked without pausing was sent to an unsearched
  catalogue. It surfaced as an end-to-end failure that landed on a different
  test each run, which is worth recognising: a failure that moves is a race, not
  a flaky assertion, and re-running it until it passes hides a real bug.
- **A migration that converts a column's type has to drop every check
  constraint mentioning that column, not just the obvious one.** Found
  2026-09-12 converting `products.kind` to an enum: the first `apply_migration`
  aborted with `operator does not exist: product_kind = text` and changed
  nothing. Postgres stores a check constraint with its literal already cast, as
  `kind = 'digital'::text`, so rebuilding one against an enum column has no
  operator to use. `products_file_fields_check` and
  `products_digital_in_stock_check` both mention `kind` and both had to come off
  before the conversion and go back on after. The corrected SQL, and a rollback
  needing the same treatment in reverse, are in
  `openspec/changes/type-product-kind/design.md`.
- **A green `npm run test:smoke` does not mean your code is deployed.** It
  asks the production alias four questions the store has answered correctly
  since 2026-09-10, so it passes just as well against a build from before
  anything you wrote. Vercel builds from the remote, not the working tree, so
  the check that the live site is current is `git status -sb` — if it says
  `ahead N`, production is N commits old however green the suite is. This is
  how the 31-commit gap in section 10 went unnoticed.
  **Since 2026-09-12 that check answers for one shop only.** Each branch feeds
  its own Vercel project, so `git status -sb` on `fif` says nothing about the
  demo and `main` says nothing about the real shop. Standing on the wrong branch
  gives a false all-clear. Check the branch you are asking about.
- **`npm` does not load `.env`.** A script in `package.json` that shells out to
  a CLI expecting an environment variable will not see anything `.env` holds.
  This is why `npm run db:types` goes through `scripts/db-types.mjs`, which
  reads `SUPABASE_ACCESS_TOKEN` out of the file itself, rather than being a
  one-line `supabase gen types` in `package.json`.
- **`pinia-plugin-persistedstate` ships a broken type declaration.**
  `dist/nuxt/runtime/storages.d.ts` imports `../types.js` while the package only
  publishes `types.d.mts`, so `StorageLike` resolves to nothing and
  `piniaPluginPersistedstate.localStorage()` has no usable type. Found
  2026-09-12 when the `no-unsafe-*` rules went to `error` and
  `app/stores/color-mode.ts` failed on it. The store makes the two
  `window.localStorage` calls itself now, which is the whole body of that
  helper. Worth knowing before reaching for anything else in that package.
- **The generated `server/types/database.ts` trips
  `no-redundant-type-constituents`** twice, so it is in the ESLint ignore list.
  Nobody edits it by hand and the typecheck still covers it.

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

**The plan agreed on 2026-09-11, and the shape of everything below.** This repo
is about to become two shops running the same code:

- **AI Storefront**, at `ai-storefront.bobdempsey83.com`, the template's own
  demo. This is the one being set up first, out of the existing deployment.
- **Forged in Filament**, at `fif.bobdempsey83.com`, the real 3D-printing shop
  the catalogue was built for.

Both are subdomains of `bobdempsey83.com`, so there is no domain to buy: each
needs a CNAME pointing at Vercel, and Vercel issues the certificate once it
resolves. Confirmed 2026-09-11 that the zone really is in Route 53 and not
managed by Vercel: the domain answers with `awsdns-*` nameservers, and
`vercel domains ls` reports zero domains on the account. So the records go in
Route 53, not in Vercel's own DNS.

~~The AWS CLI is installed on this machine but not usable.~~ **Fixed
2026-09-11.** The stale credentials were replaced with a key pair belonging to a
new IAM user, `route53-dns`, carrying `AmazonRoute53FullAccess` and nothing
else. The account had no IAM users at all before this: the user works as root,
and a root key was declined because it cannot be scoped or revoked without
taking the whole account with it. `aws sts get-caller-identity` now returns
`arn:aws:iam::134347609656:user/route53-dns`, and an agent can write and read
back Route 53 records itself rather than handing values to the user to paste.
**The `bobdempsey83.com` hosted zone is `Z071721280HQ6W3TJD8O`** (the account
also holds `robertdempsey.com`, which is nothing to do with this project).

The rename to `ai-storefront` is **partly done as of 2026-09-11**. `package.json`
and the README title carry the new name, and the GitHub repo is now
`BobDempsey/ai-storefront` with the git remote updated; Vercel's GitHub
integration followed that rename on its own and kept deploying. The **Vercel project** was renamed the same day, in
Settings then General then Project Name, since the CLI has no
`vercel project rename`. Two things turned out better than expected and are
worth not re-worrying about: the **project ID does not change**, so
`.vercel/project.json` stayed valid and `vercel link` did not need rerunning,
and the **generated `.vercel.app` aliases did not change either**.
`ecommerce-store-theta-sable.vercel.app` still serves the site and no
`ai-storefront-*` alias was created. It is no longer what the smoke test
targets, though: that now points at the custom domain (below). Vercel's GitHub
integration also followed the repo rename on its own and kept deploying.

The rename is **complete as of 2026-09-11**. The last piece, the **local
folder**, is now `C:\Users\bobde\Desktop\ai-storefront`; it was renamed between
sessions, because doing it from inside a session moves the working directory out
from under the session doing it. Nothing broke in the move: git, the `.vercel`
link and `node_modules` all travelled with the folder, and `npm test` passes
from the new path.

The public name a customer sees, `NUXT_PUBLIC_STORE_NAME`, is "AI Storefront"
in `.env` as of 2026-09-11 and becomes "Forged in Filament" on the other
deployment. It is still `Store` on Vercel.

Each shop gets its own Supabase project. The existing one is already called
`forged in filament`, so it stays with that shop, and the **new** project is the
one for AI Storefront, built from `supabase/schema.sql` and `supabase/seed.sql`.
Note the sequencing trap in that: the `ai-storefront` deployment will be live
against the `forged in filament` database for a while, because the rename
happens first and the split happens later. Until it is repointed, orders placed
on the demo land in the real shop's tables.

~~The open question is whether the second shop needs a branch at all.~~
~~Settled 2026-09-12: a second Vercel project built from `main`, not a branch.~~
**Reversed the same day, and this is now the shape of the project.** What that
decision said: nothing in the code differs between the two shops, the store
name, credentials, sender and domain are all environment variables, so two
projects from one branch do it with no merge to keep them in step. It ended with
the condition that undid it: *a branch only earns its keep if the two shops'
code has to diverge, and today it does not.*

**The premise was wrong about tomorrow.** `ai-storefront` is a template and
Forged in Filament is a shop built from it, which will diverge from it
substantially. Sharing a branch means every shop change also ships to the
template and to a public demo, which is the opposite of what a template is for.

**So `fif` is a long-lived branch**, protected against deletion and force-push,
and the `forged-in-filament` Vercel project builds production from it. `main`
stays the template and the demo.

**Where that Vercel setting lives, because it has moved**: Environments, then
Production, then Branch Tracking. Not the Git page. And **prove it from
deployment metadata rather than the settings page**: each deployment records
`githubCommitRef` and `target`, which is what showed the repoint working. The
same `fif` push built `target: null` before the change and `target: production`
after it. An HTML comment was tried as a marker first and proved nothing,
because Vue strips comments from a production build.

**A push to `main` still builds a preview on the shop's project.** That is
Vercel building every branch by default, and it is harmless: the shop's live
site only changes on a `fif` push, which is what was verified. It does spend
build minutes on a Hobby plan, so an Ignored Build Step is worth considering if
they ever run short.

**Verified 2026-09-12, and this is what "done" looks like here**: a push to
`fif` built `target: production` and the shop's live site changed; a push to
`main` built only a preview on that project and the live shop did not move; both
branches refuse deletion and force-push, tested by trying; CI ran on both; and
`SMOKE_SHOP=demo` and `SMOKE_SHOP=fif` are 6/6 each. The Vercel Framework Preset
on the shop's project reads Nuxt now rather than Other.

**Every email names the shop that sent it, 2026-09-12.** Two shops write to one
staff inbox, and until this a notification read `New order from Ada Lovelace
($23.20)` whichever shop took the order. Staff mail carries a bracketed prefix,
`[Forged in Filament] New order from ...`, because an inbox is sorted on
subjects; customer mail gets a phrase, `Your Forged in Filament order <id>`,
because a bracket reads as machinery to a buyer. The name comes from
`NUXT_PUBLIC_STORE_NAME`, the same value the header shows, so a shop cannot send
under a name it does not display.

**`Store` counts as unconfigured rather than as a name**, and that is an older
decision respected rather than overruled: `sendCustomerEmail` carried a comment
saying it omitted the name because "Your order from Store" reads as a bug. A
shop still on the placeholder gets the older, plainer subject. Mail always
sends, whatever the name: by the time these run the order is committed and the
email is the only thing telling anyone about it.

**One subject could not be verified before shipping.** A dev deployment marks
every order a test and a test order sends no email at all, so the order
notification's new subject has no way to be seen outside production. The contact
path was sent for real and Resend delivered `[AI Storefront] Custom order
request: Subject check`; the order subject goes through the same helper and is
unit-tested. The first real production order is what confirms it.

**Confirmed by inbox screenshots, 2026-09-13.** The fixed subject arrives as
`[AI Storefront] Custom order request: Subject check`; four earlier emails, two
of them the two shops' order notifications, are indistinguishable from each
other, which is the gap this closed. All arrive from `orders@bobdempsey83.com`
and land in Gmail's Updates tab rather than spam, so SPF and DKIM are working.

**Only the subject names the shop; the bodies do not.** The headings still read
`New order <id>` and `Custom order request`, so a forwarded or printed email is
anonymous again. Raised with the user on 2026-09-13 and **deliberately left**:
the subject is what an inbox sorts on, which was the actual problem. Worth
revisiting if staff ever forward these.

**This was the first template fix taken into `fif` by cherry-pick**, which is
how that branch is meant to receive them. It applied clean, and `.mcp.json` was
never in the commit, so nothing had to be held back.

**The one guard that is instruction rather than mechanism**: nothing stops a
legitimate push to the wrong branch. `AGENTS.md` and `CLAUDE.md` both open by
telling an agent to run `git branch --show-current`, and that is the whole
defence. Branch protection does not help here, because pushing shop code to
`main` is a perfectly valid push. If this ever goes wrong, the fix is a
revert on `main` and a cherry-pick onto `fif`, not a force-push. **Template fixes reach the shop only when
someone takes them**, by cherry-picking; there is no scheduled merge and adding
one later needs a decision. `fif` never merges back. The two are meant to drift,
so nothing should try to hold them together.

**Also settled the same day: the real shop keeps the existing database and the
demo moves.** The existing project is `wfhhkdmgouyxnrxnbaeo`, already named
`forged in filament`, and repointing a deployment is the risky half of the work,
so it is done to the shop where a mistake costs least. The demo sells nothing.
The cost, accepted deliberately: the demo's existing rows stay behind in the
real shop's database, because no column records which shop took an order and
matching them after the fact would be guesswork.

**Vercel's Hobby plan is fine, decided 2026-09-12.** The question was raised
because Hobby is for non-commercial use and Forged in Filament reads like a real
shop; the user settled it: it is not a commercial item. So both shops stay on
Hobby, two projects from the one repo, and nobody needs to pay for Pro. Revisit
only if the shop starts taking money, which it cannot today, since payment is
deliberately out of scope and no payment runs through the site.

**The demo has its own database as of 2026-09-12**, which is the first stream of
that plan done. The new project is `qtzwrwstixqgnuixfajp`, `ai-storefront-demo`,
`us-east-2`, built from `schema.sql` and `seed.sql`; the demo's Vercel project
reads it on Production and Preview. `wfhhkdmgouyxnrxnbaeo` was not repointed and
nothing in it was deleted, so the demo's old rows are still there and are the
real shop's to clear. Verified by placing a real order on the live demo and
finding it in the new project and absent from the old one, then deleting it.

**Two things in the repo still assume one project.** `scripts/db-types.mjs`
hardcoded the old ref, which made task 2.5's "no diff" check worthless: it read
the old project whatever the new one held. It takes `SUPABASE_PROJECT_REF` now,
defaulting to the real shop. **The override does not work yet**, because
`SUPABASE_ACCESS_TOKEN` is scoped to one project and
`supabase gen types --project-id <new ref>` fails with
`LegacyGenTypesUnexpectedStatusError`; widening it is task 2b.2. The schemas were
compared directly instead, an md5 over every column's name, type and nullability
across 48 columns, and they match. And **`.mcp.json` pins the Supabase MCP
server to the real shop's `project_ref`**, so a session needing another project
has to repoint it and restart to re-authorise.

**The Supabase MCP server could not do that stream's work at all.** It is pinned
to one project and to `features=database,docs`, so it has no `create_project`
tool and every write would have landed on the real shop. The access token is
scoped the same way: `POST /v1/projects` is 403 and `GET /v1/organizations`
returns empty. Creating a project needs a human at the dashboard or a token with
organisation scope, and that is worth knowing before planning the third shop.

**Per-shop share images landed 2026-09-12**, the second stream of that plan.
`public/og-image-forged-in-filament.png` is committed, and
`scripts/og-image.mjs` generates one for any shop from a name and a domain, so a
third shop's image is a command rather than an afternoon. Nothing in the repo had
ever drawn `og-image.png`, so that script is new rather than recovered.

**This added `NUXT_PUBLIC_OG_IMAGE`, and it defaults to empty on purpose.** It
is a path under `public/` with a leading slash, set per deployment because the
image has the shop's name drawn into it. Defaulting it to `/og-image.png` would
put the demo's picture on the real shop's link previews, which is the thing the
work exists to stop, so an unset one omits the share tags instead. **Both
deployments must set it**: the demo's Production and Preview carry
`/og-image.png` as of 2026-09-12, and the real shop needs
`/og-image-forged-in-filament.png`. A shop that forgets it ships previews with
no picture, which is quiet rather than broken, and so easy to miss.

**The smoke test names a shop rather than an address.** `SMOKE_SHOP=demo|fif`
carries both the address and the store name it expects, so it can assert a shop
reports its own name rather than the `Store` placeholder. `SMOKE_BASE_URL` still
works for an address in no list, such as a preview or a fork. It is 6 checks now
and the reporter prints which shop each line checked, because a green run should
still answer "which one?".

**The second shop is live, 2026-09-12.**
`https://fif.bobdempsey83.com` serves over valid TLS from the Vercel project
`forged-in-filament` (`prj_kSlBPYnexX9YcOfmNZAiic73g6iF`), built from the same
repo and, as of later that day, from its own `fif` branch. Ten variables on Production and Preview, its
own store name, its own share image, and the **real shop's** database
`wfhhkdmgouyxnrxnbaeo`, which it keeps. **The two shops are split**: the demo
reads `qtzwrwstixqgnuixfajp` and the real shop reads the original, so an order on
one cannot appear on the other. `npm run test:smoke` is 6/6 against each.

Four things from standing it up that the next shop will hit. **The Vercel MCP's
`create_git_project` cannot make a second project from an already-linked repo**;
it finds the first one and hands that back. `vercel project add <name>` then
`vercel git connect <repo url>` from a scratch directory holding a
`.vercel/project.json` for the new id does work. **The per-domain CNAME target
does not need the dashboard after all**: `vercel domains verify <domain>`, run
from a directory linked to the project, prints the record, and here it was
`2b224a9aefe77392.vercel-dns-017.com.`. `vercel domains inspect` still refuses
the subdomain. **The domain resolved and certified immediately**, on a 300-second
TTL, as the demo's did. And **the new project's framework preset reads "Other"
rather than "Nuxt"**, which the CLI cannot change; the build works regardless,
because Nitro detects Vercel and writes `.vercel/output` whatever the preset
says, but the two projects do not match and it is worth one click in the
dashboard.

**Custom-order requests are built**, the last stream: a search that matches
nothing now offers "ask us about it" beside "clear the search", which carries the
term to the contact form. It goes through the **existing** contact path with a
`kind` on the schema rather than a second route, so validation, rate limiting,
delivery and failure reporting are all the ones already in use; staff see
"Custom order request:" in the subject and a paragraph saying no order exists
and no price was quoted. The assistant gained a sentence of `SYSTEM_PROMPT` and
**no tool**, the fifth change in a row to take that shape. The term travels on
its own store rather than the assistant's, deliberately: a path that avoids the
model should not hold its state.

**The split is verified, 2026-09-12.** Both shops serve their own name, their
own catalogue and their own share image, with clean consoles; `test:smoke` is
6/6 against each. A real order on the real shop landed in
`wfhhkdmgouyxnrxnbaeo` and was deleted; the demo's equivalent, placed by stream
B, is absent from that database. **They share no rate-limit state**: the contact
route limits at 3 and validates afterwards, so invalid payloads spend the
allowance without sending anything, and the real shop 429s on the fourth while
the same caller still gets 400 on the demo. **What is not verified is email**:
the agent has no mailbox, so whether the staff notification and the buyer
confirmation actually arrive for the second shop is the user's to confirm, the
way the opt-in welcome was.

**The plan is written up as the OpenSpec change `split-into-two-shops`**,
proposed 2026-09-12 and not yet started. It is deliberately shaped for parallel
agents: four streams over disjoint files and accounts, then a verification gate.
Stream B, the demo's new database, is the only one that can take a shop offline,
so serialise around it if anything has to be. Two new capabilities come with it,
`storefront/shop-identity` and `contact/custom-order-request`, and
`ordering/test-order` is modified, because "the live shop" stops being one thing
once two of them are live and each deployment has to judge itself.

`tasks.md` carries both phases as a checklist.

Known gaps, roughly in the order they were prioritized with the user:

- ~~The email leg has never run.~~ **Done** — verified 2026-08-31, see section 1.
  Still nothing sends to an arbitrary staff address until a domain is verified.
- ~~No tests of any kind.~~ **Done, 2026-09-10.** A committed suite now runs in
  four parts, each with its own script, because they need different things to
  be true before they can pass:
  - `npm test` — the typecheck, then 236 unit tests across 18 files, over
    `pricing`, `promo`,
    `rate-limit`, `schemas`, `client-address`, the assistant's read and write
    tools, its promo boundary, its product prefill, `confirmations`, the orders
    route, the customer email, the colour-mode toggle, the navbar attention dot
    and the deployment environment. It was 60 when
    this suite landed; the assistant, client-address, buyer-confirmation,
    assistant-promo, navbar and dot changes brought the rest, and removing the
    auto-open and the dot's storage flag took 21 back off. The prefill,
    reasoning-effort and two deployment changes took it 173 to 198, then search,
    pagination and the two typing changes took it to 236. The tests themselves
    run in about a second and the typecheck ahead of them costs about 13, so
    `npm run test:unit` is still the fast loop. No network, no database. The two newest files test
    Pinia stores rather than server
    utilities, which is why
    `vitest.config.ts` now carries a `~` alias and `setup.ts` stubs
    `piniaPluginPersistedstate`: a store reads that while its module is being
    evaluated, so it has to exist before a test file imports one. `tests/unit/setup.ts` supplies the Nuxt
    auto-imports (`createError`, `useSupabase`) that server code expects and
    Vitest does not provide.
  - `npm run test:db` — 44 tests across 6 files that call the real
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
  - `npm run lint` — ESLint with type-aware rules, deliberately outside
    `npm test` because it took the run from 20 seconds to 36. `npm run check`
    is the typecheck, the linter and the tests together, which is what to run
    before a push. 0 errors and 0 warnings as of 2026-09-12.
  - `npm run test:smoke` — 5 checks against the deployed site, the last of
    them that the live shop renders no deployment banner. Fails when the
    network or the deploy is down, which is why it is not in `npm test`.
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
- **`POST /api/orders` marks an order as a test in two cases as of 2026-09-11**,
  and the second is new: **any order placed on a deployment that names itself
  something other than the live shop**, through `NUXT_PUBLIC_DEPLOY_ENV`. No
  header, nothing asked of the caller. Clicking through a dev server or a
  preview therefore produces no staff email and nothing anyone has to fulfil,
  which matters because every deployment still writes to the same `orders`
  table until the shops are split. The environment is read from the server's own
  runtime config, never from the request, so a browser cannot claim to be a
  preview.
  **This reverses half of a decision recorded below, and the reasoning is worth
  reading before reversing it back.** The original rule was that the build
  environment must not decide this, because production would then run a branch
  no test exercised. That was about `NODE_ENV`. Production leaves
  `NUXT_PUBLIC_DEPLOY_ENV` unset and so takes exactly the path it always has;
  the new branch belongs to dev and preview and has its own tests.
  **The rate-limit exemption deliberately did not widen**, so the two conditions
  are no longer one boolean: the token still skips the limiter, a non-production
  deployment does not. A person clicking through a dev server should meet the
  limiter a customer meets, or it is never exercised outside CI, which is how a
  broken limiter reaches production unnoticed. See
  `openspec/changes/mark-non-production-orders-as-tests/`.
  The original rule, still true for the header: **a request carrying the
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
- ~~No SPF/DKIM.~~ **Already done, discovered 2026-09-11.** `bobdempsey83.com`
  has been verified in Resend since 2024-11-30 (domain id
  `fd7aee32-37ae-4f0c-bbf8-db933882d86e`, region us-east-1, sending enabled),
  and all three records it asks for are live in Route 53: the DKIM TXT at
  `resend._domainkey`, and at `send.` an MX to
  `feedback-smtp.us-east-1.amazonses.com` priority 10 plus an SPF TXT of
  `v=spf1 include:amazonses.com ~all`. Confirmed twice, through the Resend MCP
  server and by reading the zone back with the AWS CLI. **So this was never
  blocked; the sandbox sender was.** Every note in this document about mail
  being undeliverable traces to `NUXT_ORDER_FROM_EMAIL` still being
  `onboarding@resend.dev`, not to a missing domain. **Pointing it at the verified
  domain closed them, the same day**: `NUXT_ORDER_FROM_EMAIL` is
  `orders@bobdempsey83.com` in `.env` and on both Vercel environments, and
  production was redeployed, since changing a variable does not rebuild what is
  already running. `test:smoke` passes 4/4 against the domain afterwards.
  **Confirmed the same day, end to end.** A real order was placed against
  production for `bobdempsey@proton.me`, an address with no connection to the
  Resend account, and both emails arrived: the buyer's confirmation from
  `orders@bobdempsey83.com` and the staff notification to the Gmail. Both
  showed $16.00 subtotal, a 20% store sale of -$3.20 and a $12.80 total,
  matching the API's own `totalCents`. **Both landed in the inbox, not spam**,
  and Gmail filed its copy under Updates, which is the SPF and DKIM records
  doing their job. The order (`f5e7f30c-f343-42d8-abfc-211cadc62a58`) and its
  items were deleted afterwards through the PostgREST endpoint with the service
  key, since the `supabase` MCP server was not authorized in that session.
  Note what could not be used here: a **test order sends no email at all**, so
  proving delivery needs a real one, with a real row to clean up after.
  **Decided 2026-09-11: the sender is an address on `bobdempsey83.com` with no
  mailbox behind it**, and the user's personal Gmail stays as
  `NUXT_ORDER_ADMIN_EMAIL`. The distinction that settled it: anyone can send
  mail *to* a Gmail address, but Resend can only send *as* an address whose
  domain carries DNS records authorizing it, and nobody can add DKIM to
  Google's zone. Verification needs the domain, not a mailbox, so
  `orders@bobdempsey83.com` can send with nothing receiving there; a buyer who
  hits Reply reaches the Gmail through the reply-to the email already sets. No
  mailbox has to be bought or hosted.
  A Route 53 quirk if these ever need rewriting: TXT values must be
  double-quoted, and the DKIM key is over 255 characters, so it is stored as
  two quoted strings concatenated. Admin mail lands in junk and the
  buyer confirmation reaches no real customer until a domain is verified in
  Resend. It was set aside by the user on 2026-09-10 as a per-deployment setup
  step, alongside the custom domain and the `Store` placeholder standing in for
  `NUXT_PUBLIC_STORE_NAME` in production; all three were to land in the README
  instead, and did, in a "Before you take it live" section added 2026-09-11
  covering the store name, the domain and SPF/DKIM, plus the trusted-IP header
  and the two Vercel traps this project hit. **The other two closed the same
  day**: the domain is live and the production store name is set (both below).
  This one is what is left, and it is still the user's to do. Note that the
  domain now exists, so the remaining work is verifying `bobdempsey83.com` (or
  a subdomain of it) in Resend and adding the records it hands back to the
  Route 53 zone `Z071721280HQ6W3TJD8O`, which the `route53-dns` credentials can
  now write directly.
- ~~The customer confirmation has never reached a real customer.~~ **It has,
  2026-09-11.** The sandbox sender was the only thing stopping it; see the
  SPF/DKIM item above for the order that proved it.
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
  email. ~~**The sandbox sender still delivers only to the Resend account
  address, so a real buyer receives nothing until a domain is verified.**~~
  **Fixed 2026-09-11**, and verified against a Proton address: the sender is
  now `orders@bobdempsey83.com` on a domain that had been verified in Resend
  since 2024. A buyer receives their confirmation.
- ~~Each product needs more description text than it has.~~ **Done,
  2026-09-11.** All nine descriptions are now a paragraph of three or four
  sentences, keeping the original terse spec line as the opener and adding what
  the thing is for, how it behaves and how to look after it. Multi-paragraph
  copy was considered and rejected: the Files tab renders the description
  straight into a card, so a long one has to stay one block.
  **Two places hold this text, and they are not the same place.**
  `supabase/seed.sql` seeds a fresh project, and the live `products` rows are
  what the running shop reads, so both were written; the live ones went through
  the PostgREST endpoint with the service key. A change to the seed alone would
  have looked like it worked locally and changed nothing on the site. No
  redeploy was needed, since descriptions are read per request.
  The longer copy broke something small on its way in: the product page had
  been passing the whole description to `useSeoMeta`, so `<meta name=
  "description">` and `og:description` went from one line to a 300-character
  paragraph that a search result or a link preview truncates mid-sentence. A
  `summarize()` helper in `app/pages/products/[slug].vue` now takes the lead
  sentence, which is why the opener is still written to stand on its own.
- ~~The homepage never said what the shop was, or that it had an assistant.~~
  **Done, 2026-09-11.** An introduction sits above the catalogue card in
  `app/pages/index.vue`: what the shop sells, the two ways to order, and a
  panel naming four things the assistant can do with an "Ask the AI Shop
  Assistant" button that calls `openDrawer()`. The copy went through several
  rounds with the user the same day and is theirs, not a draft to tidy: it
  calls the feature the **AI Shop Assistant** by name throughout, opens with
  "An AI-assisted shop", and avoids colons and semicolons in visitor-facing
  prose. `AssistantDrawer.vue` was renamed to match, in its header, its input
  placeholder, its aria-label and its greeting. **Each bullet is
  written against a tool in `server/utils/assistant.ts`**, not against the idea
  of the feature, and the `CAN_DO` array carries a comment saying to keep them
  in step; `tests/unit/assistant-promo-boundary.test.ts` already pins the tool
  list, so a tool arriving without the copy following is at least visible. The
  section also states what the assistant cannot do, because a visitor who knows
  it cannot place an order or take payment reads a refusal as the design rather
  than a failure, and because the alternative is spending one of the 25 messages
  finding out. **The promo-code boundary is no longer stated there**: an earlier
  draft said the assistant cannot hand out a discount, and the user's rewrite
  dropped it. The rule still holds in `SYSTEM_PROMPT` and is still pinned by
  `tests/unit/assistant-promo-boundary.test.ts`; only the page stopped saying
  so. **Nothing in it is specific to this shop**: it renders
  `storeName` and describes the assistant, both of which the Forged in Filament
  deployment has too, so it does not need editing or hiding when the same code
  runs the other store. The catalogue card's `<h1>Shop</h1>` dropped to an
  `<h2>`, since the page has a real `h1` now.
- ~~A visitor reading a product page has no way to ask about it.~~ **Done,
  2026-09-11**, through the OpenSpec change `ask-assistant-about-a-product`.
  The product page carries an "Ask about this" button that opens the panel with
  a question naming that product already in the message box, focused, cursor at
  the end. **It is not sent.** Auto-sending was considered and rejected with the
  user: it would spend one of the day's 75 requests on every click, including
  the accidental ones, so the click as shipped costs nothing at all and three
  end-to-end tests count the POSTs to `/api/chat` to keep it that way.
  **The assistant gained nothing again**, the same shape as the promo-code work:
  no tool, no argument, no `SYSTEM_PROMPT` change, no server change. It learns
  which product from the words of the question, exactly as if they had been
  typed, so there is no new surface to exploit.
  Three things to know before editing it. The prefill travels as store state
  (`prefill` on the assistant store, taken by `takePrefill()`), not a route
  query, because a query changes a shareable URL and refills the box on reload.
  **The visitor's own typing wins**: the drawer copies the text only into an
  empty box, so a half-typed message survives a click. A conversation in
  progress does not block it, and **that guard was tried and taken back out the
  same day**. It read as broken: asking about one product, then browsing to
  another and asking about that one is the ordinary path, and under the guard
  the second click opened a panel with an empty box and nothing to explain why.
  Careful and broken looked identical. Note that the conversation only survives
  in-app navigation; a full page load rebuilds the store and takes it with it,
  which is why the test for this clicks links rather than calling `goto`.
  The drawer takes the prefill on open rather than on close, which is what stops
  one product's question reappearing when the panel is next opened from the
  navbar.
  Unit coverage went 173 to 181; the e2e suite went 2 tests to 7, still free,
  the new ones faking the reply with `page.route` so no provider is called.
- ~~A dev server, a preview and the live shop look identical.~~ **Done,
  2026-09-11**, through the OpenSpec change `mark-non-production-deployments`.
  Anything that is not the live shop now carries an amber bar above the header
  and its name in the tab title. The prompt for it was real: a delivery test the
  same day placed a genuine order against production that had to be deleted by
  hand, and until the two shops' databases are split every deployment writes to
  the same `orders` table.
  **The asymmetry is the design, and is what to preserve.** `NUXT_PUBLIC_DEPLOY_ENV`
  names the environment, and both unset and `production` render nothing, so the
  live shop is the case that needs no configuration and the only way to put a
  bar in front of a customer is to actively type a value. A boolean meaning
  "not production" would have failed the other way. `tests/smoke/production.test.ts`
  asserts the live domain serves no banner.
  Two things that bite. **A Vercel preview cannot detect itself**: its build is
  byte-identical to production's, so `import.meta.dev` is false there and the
  variable has to be set by hand, which it now is. And the bar carries **no
  `role="status"`**, deliberately: it is static text, and a live region there
  collided with the assistant's waiting indicator, which broke an end-to-end
  test with a strict-mode violation on `getByRole('status')`.
  The resolver is `app/utils/deploy-env.ts`, unit-tested over the cases that
  decide whether anything renders at all.
- **TypeScript is pinned to `^5.9.0`, and it is parked rather than forgotten.**
  Moved out of `tasks.md` on 2026-09-12 because nothing here unblocks it: the
  blocker is upstream. `npm i -D typescript` installs 7.0.2, whose package
  exports no longer carry `./lib/tsc`, and `vue-tsc@3` resolves exactly that
  path, so the install typechecks nothing. **What to watch for is a `vue-tsc`
  release that resolves TypeScript 7's exports**, not a TypeScript release. The
  check when someone revisits it is two commands: bump both, then run
  `npm run check`. If `vue-tsc` still cannot find `./lib/tsc`, put the pin back
  and leave this note alone. There is no deadline on it and nothing in the repo
  is waiting: 5.9 typechecks the whole codebase today, including the test
  suites and `noUncheckedIndexedAccess`.
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
- **The assistant does not stream.** A reply lands whole, after a pause while
  the tool loop runs. That pause was **29 seconds** until 2026-09-11, and is now
  6 to 8, through the OpenSpec change `cap-assistant-reasoning-effort`. The
  cause was not the shop: `gpt-5-mini` is a reasoning model and
  `server/api/chat.post.ts` had never set `reasoning_effort`, so it deliberated
  before every turn. Measured on one question with the route's own prompt and
  tools, the default spent 3.4s, 4.5s and 21.1s over three rounds and 896
  reasoning tokens, the last round alone burning 768; at `low` the same question
  took 6.4s over two rounds and spent 64. The database leg is about 0.2s warm.
  **The extra round is the part worth remembering**: thinking harder sent the
  model back to look things up again rather than answer, so the reasoning
  setting bought a whole extra round trip as well as the thinking.
  `low` rather than `minimal`, which measured no faster and leaves less room for
  the rules in `SYSTEM_PROMPT`. Timed through the running route afterwards: 6.7s
  and 8.1s for two catalogue questions.
  Six seconds is still a wait with nothing on screen, so the same change gave
  the panel a spinner and a label that turns from "Thinking" to "Almost there"
  after three seconds (`PATIENCE_MS` in `AssistantDrawer.vue`). The turn is the
  point: a label that never moves stops being read and starts reading as a page
  that has hung. It is announced through `role="status"`, and the timer is
  cleared on both edges so a second question starts at "Thinking" rather than
  inheriting the end of the first.
  **One caveat, recorded rather than resolved.** The first `npm run test:llm`
  run against the new setting failed one of the six promo tests, and two
  subsequent runs of that file passed 6/6, as did a later full run at 8/8 and
  `test:e2e:llm`. The failing assertion was not captured before the rerun, so it
  cannot be said for certain whether it was a bad minute at the provider, which
  `vitest.llm.config.ts` warns about in its own docstring, or the lower setting
  being marginal. If a promo test fails again, put `REASONING_EFFORT` back to
  the default first and see whether it stops.
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
  consecutive calls, and the catalogue renders. The custom domain landed
  2026-09-11 (below), and the store name with it.
- ~~Preview has no environment variables at all.~~ **Fixed 2026-09-11.** It
  really had none, despite this document having claimed since 2026-09-10 that
  all seven were set on both, so any branch or pull-request preview would have
  built unconfigured and served the error page production served on 2026-09-10.
  Eight are now set on Preview, the seven from `.env` plus the new
  `NUXT_PUBLIC_SITE_URL`. `NUXT_TEST_ORDER_TOKEN` is still deliberately absent
  from both, so no deployed request can mark an order as a test.
  **Unverified, and not cheaply verifiable**: a preview URL sits behind Vercel's
  deployment protection and answers a login page to anything that is not a
  signed-in browser, so `test:smoke` cannot be pointed at one, and a successful
  build proves nothing either — production built cleanly with empty values.
  The first real preview is the test.
  Two consequences worth knowing before using one. **Preview shares the
  production database**, because it holds the same `NUXT_SUPABASE_URL`, so an
  order placed on a preview is a real row in the real `orders` table; that is
  the same trap section 10 opens with for the two shops, and it goes away when
  the databases split. And **`NUXT_PUBLIC_SITE_URL` on Preview names the
  production domain**, so a preview page's share tags advertise production URLs.
  Harmless, since nobody pastes a protected preview link, and the alternative is
  a value that changes with every deployment.
- ~~No Open Graph tags, so a texted link previews as a bare URL.~~ **Done,
  2026-09-11.** Defaults live in `app/layouts/default.vue` beside the
  `titleTemplate`, and `app/pages/products/[slug].vue` overrides the title,
  description and image with the product's own. Four things are worth knowing
  before touching them. **`useSeoMeta` in a page beats the layout**, because the
  page's call runs second, which is why the defaults are safe to state broadly.
  **Open Graph refuses a relative image path** and drops it silently, so both
  URLs are built against `NUXT_PUBLIC_SITE_URL`; with that unset the image is
  omitted on purpose, since tags that look right but never show a picture are
  worse than tags that admit they have none. **Declared dimensions are
  inherited**, so the product page restates 800x800 over the layout's 1200x630
  rather than letting a consumer letterbox a square photo, and drops to
  `twitter:card: summary` for the same reason. And **the share image is per
  shop**: `public/og-image.png` has "AI Storefront" rendered into it, so
  Forged in Filament needs its own file rather than this one. It was generated
  headlessly from an HTML page through the Playwright already in the repo,
  which is how to make the next one.
- ~~No custom domain.~~ **Done, 2026-09-11.**
  `https://ai-storefront.bobdempsey83.com` serves the store over valid TLS.
  Added to the Vercel project against Production, then a CNAME written into
  Route 53 by the CLI. Three things worth knowing before doing the same for
  `fif`. **Vercel no longer asks for `cname.vercel-dns.com`**: it issues a
  per-domain target, here `63f2d142a70b0e9d.vercel-dns-017.com.`, so read the
  value off the project's Domains tab rather than reusing this one. **The
  subdomain is not a Vercel domain**, only a domain attached to a project, so
  `vercel domains inspect` refuses it with "you don't have access" and the
  console is the only place that shows the target. And **it resolved almost
  immediately**, on a 300-second TTL, so the certificate issued on the first
  Refresh rather than after the wait the DNS-propagation warning implies.
  `tests/smoke/production.test.ts` now defaults to this domain instead of the
  `.vercel.app` alias, overridable with `SMOKE_BASE_URL`, which is how the
  second shop will be checked by the same suite; `npm run test:smoke` passes
  4/4 against it. The README gained a matching note in "Before you take it
  live".
- ~~Production is 31 commits behind local `main`.~~ **Closed 2026-09-11.**
  `main` was pushed at `7419568`, 40 commits on from `e0fd7e1`, and Vercel's
  GitHub integration built and promoted it on its own. Verified beyond the
  smoke check, which proves nothing about currency: a browser against the
  production alias shows the `pi-microchip-ai` icon, the attention dot, the
  two-state theme control and the new greeting, so the test suite, the
  rate-limit fix, the buyer confirmation, the assistant promo field and both of
  today's UI changes are all live. Note that the deployed rate limiter now
  believes only `NUXT_TRUSTED_IP_HEADER`, which is set to Vercel's own header.
  A second push the same day (`f023612`) took the phone-width catalogue fix
  live; verified at 390px against the production alias, a card measures 324px.
  **The gap opened again later on 2026-09-11 and was closed the same day.**
  `origin/main` had fallen six commits behind local `main`, so the product-page
  prefill, the assistant latency work, the deployment banner and the
  non-production test orders were all committed and none of them was live.
  `main` was pushed at `8289dd0` and Vercel's GitHub integration built and
  promoted it. Verified beyond the smoke check: the live product page carries
  the "Ask about this" button, and the homepage renders no deployment banner,
  which is the live shop's own case for `NUXT_PUBLIC_DEPLOY_ENV` being unset.
  `npm run test:smoke` is 5/5 against the domain, the fifth test being the
  banner assertion that arrived with `mark-non-production-deployments`.
  **It has opened a third time and is open now, 2026-09-12.** `origin/main` is
  12 commits behind local `main`, the last push still being `8289dd0`, so
  catalogue search, pagination, the six new products, the typecheck, the route
  types and ESLint are all committed and none of them is live. The live shop
  still serves nine products with no search box. **Closed again on 2026-09-12**,
  pushed at `7b43267` with CI green in a minute and verified live: the catalogue
  field is readonly and opens the panel seeded with the term, the tab strip
  renders no scroll arrow, the console is clean, and photos come back from
  Vercel's optimizer. A documentation commit followed at `11e3a98`, also pushed
  and green, and `origin/main` is level with local `main` as this was written. **The gap reached 23 commits
  and was closed the same day.** `main` was pushed at `6afbb56` with the user's
  go-ahead, Vercel built and promoted it, and the new CI passed on its first
  run. Verified live at the domain rather than by the smoke test, which proves
  nothing about currency: `/api/products?page=2` answers with a second page,
  `?q=dragon` returns 2 of the 15 rows, and `test:smoke` is 5/5. So search,
  pagination, the twelve products, the typed database client and the `kind`
  enum are all in front of customers now. Pushing is still deploy work and the
  user still asks to be asked.
- ~~Three changes are complete and unarchived.~~ **Done 2026-09-12**, and
  `deepen-typescript` went with them. `type-product-kind` arrived afterwards and
  was archived the same day, as was `open-panel-from-catalogue-field`. There is
  no change in flight. See section 2.
- ~~Not a git repo.~~ ~~No remote is configured yet.~~ **Done, 2026-09-10.**
  `main` has history back to the initial commit; `.env` is correctly untracked
  while `.env.example` is committed. Pushed to
  `https://github.com/BobDempsey/ai-storefront`, created as `ecommerce-store`
  and renamed 2026-09-11 (public, created with `gh
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
- **Do not rewrite the root `tasks.md` wholesale.** On 2026-09-12 an agent
  regenerated it as a flat list, as `/handoff:update`'s own step 5 instructs,
  and the user reverted it: "There were other items on there that we needed."
  Its three headings and their grouping are theirs. Edit it surgically, add and
  remove single lines, and where that command and this note disagree, this note
  wins. They also edit the file themselves mid-session, so re-read it before
  changing it rather than writing from what you last saw.
- **Pushing is always a separate, explicit instruction.** They ask for commits
  and pushes as two steps, several times a session, and "create commits, do not
  push" is the normal shape of the request. Never fold a push into a commit
  because the work looks finished.
- **They will open a second interactive session for anything this one cannot
  do.** When the Supabase MCP server needed a browser OAuth flow, they asked for
  a brief on their clipboard covering both what that agent should do and what it
  should report back. Write the report-back list as numbered, specific
  questions: the answers come back verbatim and are what this session resumes
  from.
- They ask a lot of closed questions, "Yes or no?", "explain in one sentence",
  and mean them literally. Answer at that length first. Anything longer is read
  as not having answered.
