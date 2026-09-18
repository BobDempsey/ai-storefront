# Tasks

## 1. The backend interface, with nothing switched yet

- [x] 1.1 Add `NUXT_DATABASE_BACKEND` (`supabase` or `neon`) and `NUXT_NEON_DATABASE_URL` to `nuxt.config.ts` runtimeConfig and `.env.example`, defaulting the backend to `supabase`, and verify `npm run dev` still starts with neither set. **New env vars**; no Supabase migration.
- [x] 1.2 Write the backend interface and move today's client into a `supabase` implementation behind it, leaving `useSupabase()` as the exported name every call site already imports, and verify `npm test` and `npm run lint` are green with no call site edited.
- [x] 1.3 Confirm no call site changed: `git diff --stat server/api server/utils` names only `supabase.ts` and the new files, and `grep -rn "useSupabase()" server/` still returns the same nine files.

## 2. The Neon query shim

- [x] 2.1 Implement `from`, `select`, `eq`, `in`, `order`, `limit`, `single` and `maybeSingle` over the Neon driver, returning `{ data, error }`, and verify with unit tests that each builds the SQL and parameters expected.
- [x] 2.2 Implement `insert`, `delete` and `upsert` with `onConflict` and `ignoreDuplicates` as `ON CONFLICT ... DO NOTHING`, and verify a unit test covers the duplicate-email case `subscribe.ts` relies on.
- [x] 2.3 Implement `{ count: 'exact' }` and `{ count: 'exact', head: true }`, and verify a unit test asserts head-only returns a count and no rows.
- [x] 2.4 Implement `range`, returning an error carrying `code: 'PGRST103'` when the range starts at or past the total, and verify a unit test asserts that code so `products.get.ts` keeps its empty-page branch.
- [x] 2.5 Implement `or` by parsing the `col.ilike.*pattern*` form `searchFilter` produces into `ILIKE` predicates, throwing on any other form, and verify unit tests cover a plain term, a term containing `%`, and an unparseable filter.
- [x] 2.6 Implement `rpc('create_order', ...)` as a single `select` on the function, normalising a raised exception into `{ message, code }` with the raised text intact, and verify a unit test asserts `unavailable_item` survives into `error.message`.
- [x] 2.7 Make every unimplemented method and filter form throw a named error rather than return an empty result, and verify a unit test asserts the throw.

## 3. Schema, split for two backends

- [x] 3.1 Move the `enable row level security` statements and every policy out of `supabase/schema.sql` into `supabase/rls.sql`, leaving tables, constraints, indexes and `create_order` in place, and verify `schema.sql` alone applies cleanly to a scratch Postgres database. **Supabase migration**: re-apply both files to the existing project and confirm the policies are unchanged.
- [x] 3.2 Document in `supabase/rls.sql` and in `handoff.md` that the Neon path runs without RLS, why that is safe here (no public data API, no publishable key, server-only credentials) and what it gives up.
- [ ] 3.3 Teach `scripts/db-types.mjs` to generate from a Postgres connection as well as a Supabase project ref, and verify both paths emit the same `server/types/database.ts` for the same schema.

## 4. The Neon project

- [x] 4.1 Create the Neon project for the demo and apply `supabase/schema.sql` then `supabase/seed.sql`, and verify the catalogue is 15 rows, 12 physical and 3 digital.
- [x] 4.2 Compare the Neon and Supabase schemas by md5 over every column's name, type and nullability, and verify the two digests match before anything is pointed at Neon.
- [x] 4.3 Add `NUXT_NEON_DATABASE_URL` to local `.env` and record in `handoff.md` that it is a credential, server-only, and must never carry the `NUXT_PUBLIC_` prefix. **New env var.**

## 5. Prove the shim against both backends

- [x] 5.1 With the backend still `supabase`, run `npm run test:db` and verify all 44 tests pass, establishing the baseline the Neon run has to match.
- [x] 5.2 Switch local configuration to `neon`, run `npm run test:db` and verify the same 44 tests pass with the same results.
- [x] 5.3 Run `npm run test:e2e` against Neon and verify cart through placed order, including the rejected-promo-code clear.
- [x] 5.4 Place an order against Neon carrying a sale and a promo code, and verify the recorded subtotal, discount, total and redemption row match what the same order recorded on Supabase to the cent.
- [x] 5.5 Run `npm run check` and verify the typecheck, the linter and the unit tests are all green.

## 6. Cut the demo over

- [ ] 6.1 Set `NUXT_DATABASE_BACKEND` and `NUXT_NEON_DATABASE_URL` on the demo's Vercel Production and Preview, and verify both are present on both environments before deploying. **New env vars.**
- [ ] 6.2 Deploy and verify `SMOKE_SHOP=demo npm run test:smoke` is 6/6 against `ai-storefront.bobdempsey83.com`.
- [ ] 6.3 Place a real order on the live demo, verify it appears in Neon and is absent from both Supabase projects, then delete it.
- [ ] 6.4 Verify Forged in Filament is untouched: `SMOKE_SHOP=fif npm run test:smoke` is 6/6 and its backend setting is still `supabase`.
- [ ] 6.5 Measure the cold-start delay on the first request after five idle minutes and record the figure in `handoff.md`.

## 7. Record it

- [ ] 7.1 Update `handoff.md` with the new backend setting, the Neon project id, the RLS difference, the `PGRST103` emulation and the cold-start figure, and verify `/handoff:sync` reports no drift.
- [x] 7.2 Leave the demo's Supabase project `qtzwrwstixqgnuixfajp` in place and note in `handoff.md` that freeing the slot is the owner's call once the demo has run on Neon long enough to trust.
