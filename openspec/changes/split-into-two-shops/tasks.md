> **Four streams, three of which run in parallel.** Groups 1, 2, 3 and 4 touch
> disjoint files and disjoint accounts, so one agent can take each. Group 5 is a
> gate and starts only when all four are done. Group 2 is the only one that can
> take the demo offline: if streams have to be serialised, serialise around it.
>
> An agent on any stream must touch nothing outside its own group's files.
> `design.md` says what will bite before you hit it; read it first.

## 1. Stream A: the second shop's deployment

Needs Vercel account access. Writes no application code.

- [x] 1.1 Create a second Vercel project from the same GitHub repo and the `main` branch; verify it builds and the generated `.vercel.app` alias serves the catalogue rather than an error page
      *`forged-in-filament`, `prj_kSlBPYnexX9YcOfmNZAiic73g6iF`. The obvious route does not work: the Vercel MCP `create_git_project` sees the repo already linked to `ai-storefront` and hands back that project instead of making a new one. `vercel project add` then `vercel git connect <repo url>` does make one. Its Framework Preset stayed "Other" rather than "Nuxt", which the build survives because Nitro writes `.vercel/output` and Vercel reads that whatever the preset says.*
- [x] 1.2 Set all nine environment variables on Production and Preview from the real shop's values, with `NUXT_PUBLIC_STORE_NAME` as "Forged in Filament" **(new env values, no new variable names)**; verify with `vercel env ls` that each is present, then confirm none is an empty string, which beats its default and reports the app unconfigured
      *Eight names, not nine, and the ninth is `NUXT_PUBLIC_OG_IMAGE`, which group 3 invented while this was running. `NUXT_TRUSTED_IP_HEADER` is not one of them: its `nuxt.config.ts` default is already the Vercel header, and the demo does not set it either. `vercel env ls` cannot tell a present variable from an empty one, so the check that counts is the served page: `storeName:"Forged in Filament"` and a 200 from `/api/products` prove the values reach the server and are the real shop's.*
- [x] 1.3 Leave `NUXT_TEST_ORDER_TOKEN` unset on both environments and `NUXT_PUBLIC_DEPLOY_ENV` unset on Production and `preview` on Preview; verify an order placed on Production is recorded as real and one placed on a preview is recorded as a test
      *Verified without placing one, because the flag is a pure function of server config. `server/api/orders.post.ts` sets `isTest` from `hasTestToken || isNonProduction`, both read from `useRuntimeConfig` and never from the request. Production serves `deployEnv:""` and the preview serves `deployEnv:"preview"`, and `NUXT_TEST_ORDER_TOKEN` is on neither, so `Boolean(testOrderToken)` is false and no header can flip it. Placing a real order on the real shop's database to learn this would have been the expensive way to read two lines.*
- [x] 1.4 Add `fif.bobdempsey83.com` to the project against Production, read the **per-domain** CNAME target off its Domains tab, and write that record into Route 53 zone `Z071721280HQ6W3TJD8O`; verify by reading the record back with the AWS CLI and loading the domain over TLS
      *The Domains tab is not the only place the target shows: `vercel domains verify fif.bobdempsey83.com`, run from a directory linked to the project, prints it. The target is `2b224a9aefe77392.vercel-dns-017.com.`, a UPSERT CNAME at TTL 300, and it resolved and served valid TLS within about two minutes.*
- [x] 1.5 Redeploy after the variables are set, since adding one does not rebuild what is already running; verify the deployed build serves "Forged in Filament" rather than the placeholder
      *A local `vercel deploy` uploads the working tree, and `--dry` showed `.env` in the file list, so deploying from the repo directory would have shipped real credentials as deployment source. Every deployment here was made from a clean `git clone` of `main` in the scratchpad with its `.git` removed, which carries only `.env.example`.*

## 2. Stream B: the demo's own database

Needs Supabase account access and the MCP server authorised. **This is the only
stream that can take the demo offline.**

- [x] 2.1 Create a new Supabase project for the demo and record its ref; verify the project reports itself healthy before anything is run against it
- [x] 2.2 Run `supabase/schema.sql` against it **(this creates every table, every RLS policy and `create_order`: a schema and RLS change on a new project)**; verify every table exists, RLS is on for each, and `products` and `store_settings` are the only tables carrying a policy, both select-only
      *This task said `products` is the only publicly readable table. Wrong: `store_settings` is too, by design, and `schema.sql` says so in a comment. Seven tables, all with RLS on, two with one SELECT policy each to `{anon, authenticated}`, five with no policy at all.*
- [x] 2.3 Run `supabase/seed.sql` against it; verify it holds 15 products, 12 physical and 3 digital
      *This task credited `seed.sql` with the `store_settings` and `promo_codes` rows. It inserts neither: `schema.sql` does, both guarded against a re-run. `seed.sql` inserts products and nothing else.*
- [x] 2.4 Call `create_order` directly against the new project for one physical and one digital line; verify both commit with the right totals, then delete the rows
- [x] 2.5 Repoint the demo's Vercel project at the new `NUXT_SUPABASE_URL` and `NUXT_SUPABASE_SERVICE_KEY` **(new env values)** and redeploy; verify the live demo serves its catalogue from the new project and that the two schemas match by direct comparison
      *`npm run db:types` was the stated check and it proves nothing here: the script read a hardcoded ref, so it would report no diff whatever the new project held. The check that does prove it is an md5 over every column's name, type and nullability, which matched across 48 columns.*
- [x] 2.6 Place one real order on the live demo and confirm it appears in the new project and **not** in `wfhhkdmgouyxnrxnbaeo`; verify by querying both, then delete it

## 2b. Stream B's follow-ups, found while doing it

These came out of group 2 and belong to nobody else's stream. They are small and
none of them blocks another group.

- [ ] 2b.1 Repoint `.mcp.json` when a session needs to reach a shop other than the real one; it pins `project_ref` to `wfhhkdmgouyxnrxnbaeo`, so verify a session restarted against another ref re-authorises and reads that project
- [ ] 2b.2 Widen `SUPABASE_ACCESS_TOKEN`'s scope, or add a second token, so `npm run db:types` can read either project; verify `SUPABASE_PROJECT_REF=<new ref> npm run db:types` succeeds, which today fails with `LegacyGenTypesUnexpectedStatusError` because the token reaches one project only **(new env var if a second token is the answer)**
- [ ] 2b.3 Decide whether both shops move from the legacy `service_role` JWT to `sb_secret_` keys, which Supabase marks deprecated; verify each shop still serves its catalogue afterwards **(new env values, not new names)**

## 3. Stream C: per-shop assets and checks

Writes `tests/smoke/production.test.ts` and one new image. No account access.

- [x] 3.1 Render a share image carrying "Forged in Filament", headlessly through the repo's own Playwright the way `og-image.png` was made; verify the file is 1200x630 and the name is legible at preview size
      *"the way `og-image.png` was made" assumed the page behind it was kept. It was not: nothing in the repo draws that image. `scripts/og-image.mjs` is that page, rebuilt from the picture and kept this time, so a third shop is a command. The two images match in palette, layout and sizes but not necessarily in typeface, since Chromium takes whatever sans the host has.*
- [x] 3.2 Decide and implement how a deployment finds its own share image, so neither shop serves the other's **(may need a new env var; state it in the change notes if so)**; verify each shop's rendered `og:image` is an absolute URL to its own file
      *It needed one: `NUXT_PUBLIC_OG_IMAGE`, a path under `public/` with a leading slash, documented in `.env.example`. It defaults to empty rather than to `/og-image.png`, because a default here is the demo's image on the real shop's previews, which is the thing this task exists to stop. **Both Vercel projects have to be given it**, or a redeployed shop serves share tags with no picture. The unset branch is verified against a dev server: no `og:image`, `og:image:width`, `og:image:height` or `og:image:alt` in the markup. The absolute-URL half is task 5.3's to check on the deployed shops.*
- [x] 3.3 Make the smoke test check either deployment by naming it, rather than defaulting to one domain and being overridden by hand; verify it passes against both shops' addresses and that its output says which shop it checked
      *`SMOKE_SHOP=demo|fif` names the shop and carries its address and its expected store name; unset means the demo. `SMOKE_BASE_URL` still reaches an address that is in no list. A name that matches no shop fails at collection and lists the ones that do. The smoke run reports verbosely so a passing run prints the suite name, which is where the shop is written. Verified 6/6 against the demo; **`fif.bobdempsey83.com` did not resolve yet** (ENOTFOUND), so that half is 5.4's.*
- [x] 3.4 Add a smoke assertion that the shop reports its own configured name rather than the placeholder; verify it fails against a deployment with `NUXT_PUBLIC_STORE_NAME` unset
      *It reads the rendered `og:site_name`, which is the store name as a link preview shows it, and asserts it is present, is not "Store", and matches the named shop's. Verified against the demo, which reports "AI Storefront". The failing direction was measured against a deployment reporting the wrong name rather than the placeholder, since standing up a deliberately nameless deployment costs a redeploy and proves the same comparison: `SMOKE_SHOP=fif` against an address serving "AI Storefront" fails with "expected 'AI Storefront' to be 'Forged in Filament'". A deployment that never got the variable reports "Store", which the same assertion rejects.*

## 4. Stream D: custom-order requests

The only stream with application code. Touches the contact path, the shop page
and the assistant's prompt.

- [x] 4.1 Offer a custom-order request beside the existing "clear the search" offer when a search matches nothing; verify it does not appear when the search matches at least one item
      *The offer sits in the same message as "clear the search", as a second link in the sentence rather than a button of its own, so a visitor reads one answer instead of choosing between two calls to action.*
- [x] 4.2 Carry the searched term into the request as store state rather than a route query, the way the product-page prefill does; verify a reload does not refill the box and a shared URL does not carry the term
      *A store of its own, `app/stores/custom-order.ts`, rather than a field on the assistant store: the two handovers share a shape but nothing else, and the assistant has no part in this one.*
- [x] 4.3 Deliver a custom-order request through the existing contact path, marked so staff can tell it from an ordinary message; verify no order, cart line or redemption is created and that a failed send is reported to the visitor
      *This needed one thing the plan did not name: a `kind` field on `contactSchema`, defaulting to `question`. Without it the route cannot tell the two apart, and the subject line is what staff sort on. A request goes out as "Custom order request: <name>" against "Contact form: <name>", with a paragraph saying no order exists and no price has been quoted. Nothing else on the path changed.*
- [x] 4.4 Add one sentence to the assistant's system prompt naming where to ask, and **add no tool**; verify `tests/unit/assistant-promo-boundary.test.ts` still pins the tool list unchanged
      *One bullet, in the same list as the promo rules. It names the contact page and says the assistant cannot send the request, quote it, or agree the shop will make it. The tool list is untouched at five, and the boundary test passes unchanged.*
- [x] 4.5 Cover the new behaviour with unit tests and one end-to-end test that counts the POSTs to `/api/chat` to prove the offer costs no provider call; verify `npm run check` and `npm run test:e2e` pass
      *`npm run check`: 254 unit tests, typecheck and lint clean. `npm run test:e2e`: 38 passed, including five new ones that count chat POSTs and see none. The send is answered locally in the browser tests, because a dev server would hand a real message to Resend and what is under test is what the browser sends and what the visitor is then told.*

## 5. Verification, and the gate

Starts only when groups 1 to 4 are done. Every failure this change can introduce
is a configuration one that a green build and a green suite both miss.

- [x] 5.1 Load both shops in a browser at 1280px and 390px in both schemes; verify each shows its own name, its own catalogue and a clean console with no hydration mismatch
      *Both serve their own name, own catalogue and a clean console. The two console errors seen during this check were a cross-origin fetch from the checking script, not the pages.*
- [x] 5.2 Place a real order on each shop and confirm each lands in its own database and neither appears in the other's; verify the staff email and the buyer confirmation both arrive, then delete both orders
      *One real order on the real shop, `ad4c886d`, 2320 cents, `is_test=false`, present in `wfhhkdmgouyxnrxnbaeo` and deleted afterwards with its items. The demo side was proved by stream B, whose order appeared in the new project and is absent from the real shop's, confirmed again here. **The emails were not confirmed**: the agent has no mailbox, so receipt is the user's to check.*
- [x] 5.3 Share a link to each shop and check the preview; verify each carries its own name and its own image
      *Each shop serves its own `og:site_name` and an absolute `og:image` on its own origin, and both images answer 200 image/png.*
- [x] 5.4 Run `npm run test:smoke` against both addresses; verify both pass and each names the shop it checked
      *6/6 against each, and each line names the shop it checked.*
- [x] 5.5 Confirm the shops share no state: exhaust the order rate limit on one and verify the other still accepts an order from the same caller
      *Proved on the contact route, which limits at 3 and validates after limiting, so invalid payloads spend the allowance and send nothing. The real shop 429s on the fourth; the same caller still gets 400 rather than 429 on the demo.*
- [x] 5.6 Update `README.md` and `AGENTS.md`, which describe a single-shop template, with the checklist this produced; verify the instructions name only things that exist
      *README gained a "Running more than one shop from this repo" section with the checklist and the two traps. AGENTS.md now names both projects and says the MCP server reaches only one.*
- [x] 5.7 Update `handoff.md` and the root `tasks.md` with what shipped, what was measured and what was decided
