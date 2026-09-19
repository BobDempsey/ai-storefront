# Tasks

## 1. Unblock the shop's database

- [x] 1.1 Restore the Supabase project `wfhhkdmgouyxnrxnbaeo` from the dashboard, and verify `GET /v1/projects` reports it `ACTIVE_HEALTHY` rather than `INACTIVE`
- [x] 1.2 Verify `wfhhkdmgouyxnrxnbaeo.supabase.co` resolves again and `https://fif.bobdempsey83.com/api/products` answers 200 rather than 502
- [x] 1.3 Recover the shop's `NUXT_SUPABASE_URL` and `NUXT_SUPABASE_SERVICE_KEY` from the Supabase dashboard, and verify a read of `products` through `supabase-js` returns rows

## 2. Take the backend switch onto this branch

- [x] 2.1 Confirm the starting point: `git branch --show-current` is `fif` and `git branch --contains 6f19869` lists `main` only
- [x] 2.2 Cherry-pick `6f19869` onto `fif`, resolving the `supabase/schema.sql` and `supabase/rls.sql` conflict in `main`'s favour, and verify the pick completes
- [x] 2.3 Verify the pick touched nothing extra: `git show --stat HEAD` matches `git show --stat 6f19869` file for file
- [x] 2.4 Run `npm install --legacy-peer-deps` and verify `@neondatabase/serverless` resolves
- [x] 2.5 Verify `npm run check` is green, with the unit count matching `main`'s 290

## 3. Stand up the shop's Neon project

- [x] 3.1 Create a Neon project for this shop in `us-east-2`, separate from the demo's `solitary-surf-65980038`, and verify `neon projects list` shows both
- [x] 3.2 Apply `supabase/schema.sql` to it with `scripts/apply-sql.mjs` and verify every table and the `create_order` function exist, seeding nothing
- [x] 3.3 Verify `scripts/compare-schemas.mjs` reports identical digests for the shop's Supabase project and its Neon project

## 4. Move the rows

- [x] 4.1 Write a one-off migration script that reads each table through `supabase-js` with explicit ranges and writes it into Neon with `@neondatabase/serverless`, one transaction per table, ids and timestamps written explicitly
- [x] 4.2 Copy the tables in foreign-key order: `products` and `promo_codes`, then `orders`, then `order_items` and `promo_redemptions`, then `email_subscribers`
- [x] 4.3 Verify per-table row counts match between the two databases, and that no count is exactly 1000, which would mean a page was truncated
- [x] 4.4 Verify contents match by md5 over each table's rows, the way `compare-schemas.mjs` digests columns
- [ ] 4.5 Verify an order recorded before the move is found on Neon by its original id, with the same lines, totals and recorded time

## 5. Prove the two backends agree

- [x] 5.1 Point local `.env` at this shop, noting in the file which shop it names, and verify a dev server serves the shop's catalogue on each backend in turn
- [x] 5.2 Verify `npm run test:db` passes against Neon and against Supabase, with the same count each way
- [x] 5.3 Verify `npm run test:e2e` passes against Neon, checkout through to a placed order
- [x] 5.4 Verify the same cart, priced with a sale and a promo code, records the same subtotal, discount, total and redemption row on both, then delete both orders

## 6. Cut over

- [x] 6.1 Set `NUXT_DATABASE_BACKEND=neon` and the Neon connection string as secrets on the `forged-in-filament` Vercel project's Production and Preview, and verify both environments list them
- [x] 6.2 Redeploy Production and verify the deployment's `target` is `production` and it built from `fif`
- [x] 6.3 Verify `SMOKE_SHOP=fif npm run test:smoke` is 6 of 6 against `fif.bobdempsey83.com`
- [x] 6.4 Verify which backend answered by a marker the two copies do not share, since the migration preserved ids and both databases now return the same ones: read `NUXT_DATABASE_BACKEND` back off the deployment and confirm the order in 6.5 lands where it says
- [x] 6.5 Place a real order on the live shop, verify it is in Neon and absent from Supabase, confirm the staff notification arrives naming Forged in Filament, then delete it
- [x] 6.6 Verify the demo is untouched: `SMOKE_SHOP=demo npm run test:smoke` is 6 of 6 and its Neon project is unchanged
- [x] 6.7 Measure the cold start after five idle minutes and record it, so the number is known rather than assumed from the demo's

## 7. Write it down

- [x] 7.1 Record the move in this branch's `handoff.md`: the new Neon project, the two variables, the rollback, the cold start and what the migration script found
- [x] 7.2 Update this branch's `tasks.md`, ticking the Neon decision and adding the open question of when to release the Supabase project
- [x] 7.3 Verify the change validates: `openspec validate move-fif-database-to-neon --strict`
