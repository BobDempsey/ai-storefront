> **Groups 6 and 7 are done.** A read-only Supabase access token was supplied,
> so the types are generated and committed and the client takes them. Group 4
> (the `noUncheckedIndexedAccess` measurement) and group 5 (the provider run,
> which spends money) are still open, and 8.1 still wants `test:e2e` and
> `test:db`. See `notes.md` and `typed-client-errors.md`.

## 1. One shape per route

- [x] 1.1 Declare each API route's response type once, beside the route, and re-export it through `app/types/index.ts`; verify no response shape is declared in two places with a grep for the duplicated names
- [x] 1.2 Point `index.vue` and `SearchPalette.vue` at the shared `CataloguePage` rather than their own copies; verify `npm run typecheck` passes and the shop page and panel still render
- [x] 1.3 Confirm a deliberate change to a route's return type fails the typecheck at its browser call site; verify by making one, reading the error, and reverting it

## 2. The tests stop casting

- [x] 2.1 Export the assistant tools' result types from `server/utils/assistant.ts`; verify they describe what `runTool` actually returns rather than a looser shape
- [x] 2.2 Replace the `as any` casts in `tests/unit/assistant-read-tools.test.ts` and `assistant-write-tools.test.ts` with those types; verify `npm test` passes and a grep for `as any` across `tests/unit` finds nothing
- [x] 2.3 Confirm the narrowed types still catch what the casts hid; verify by changing a tool's return shape and watching those tests fail to compile, then reverting

## 3. ESLint

- [x] 3.1 Add `eslint`, `typescript-eslint` and the Vue/Nuxt plugin with a flat `eslint.config.mjs` on the recommended type-aware sets; verify `npx eslint .` runs over app, server and tests
- [x] 3.2 Read the first run's output and fix what it finds, turning a rule off only with a comment saying why; verify the run is clean and record how many findings there were (83 findings, then 52 once the parsing was right; 0 errors now, 23 warnings that all trace to the untyped client)
- [x] 3.3 Add a `lint` script and put it in `npm test` after the typecheck; verify a deliberate unused import fails `npm test`, then remove it (**moved to `npm run check` per 3.4: the full run reached 36s**)
- [x] 3.4 Time `npm test` with the lint included; verify it stays under roughly 30 seconds, and if it does not, move the lint to its own script and record the number (36.4s with lint, 20.2s without; split, numbers in notes.md)

## 4. Measure noUncheckedIndexedAccess

- [ ] 4.1 Turn the flag on and count the errors; verify the count is recorded in the change folder with a sample of what they are
- [ ] 4.2 Decide from that count whether it stays on, and write the decision and the number into the change notes; verify the chosen setting is what the repo actually ships with

## 5. The provider run

- [ ] 5.1 Run `npm run test:llm` once, which spends provider calls, and confirm the typed chat loop still completes a real tool round; verify the suite passes and note the calls it cost against the ceiling of ten

## 6. Settle how the database types are generated

- [x] 6.1 Establish whether `supabase gen types` can read `supabase/schema.sql` locally or needs a project id and an access token; verify by running both forms and recording which produced usable output (**it cannot read a schema file at all**: --local, --linked, --project-id or --db-url only)
- [x] 6.2 If it needs a token, stop and agree that before going further, then add it to `.env.example` with a note that it is needed only to regenerate types, never to build or run; verify the app still starts without it (**a token was supplied**; a dev server started with the variable removed from the env file served `/` and `/api/products` at 200)
- [x] 6.3 Add a `db:types` script that writes `server/types/database.ts`, and commit the generated file; verify re-running the script produces no diff (ran twice, same SHA-256)

## 7. The typed client

- [x] 7.1 Type `useSupabase()` as `SupabaseClient<Database>` in `server/utils/supabase.ts`; verify `npm run typecheck` runs and record the full list of new errors in the change folder before fixing any of them (5 distinct errors, recorded verbatim in `typed-client-errors.md` before anything was touched)
- [x] 7.2 Read that list and agree what is in scope; verify by naming each error's file and saying whether it is a real mismatch or a typing gap in the generated types (one real mismatch, one gap over a real call, three the same check-constraint gap; table in `typed-client-errors.md`)
- [x] 7.3 Fix the queries the typed client rejects, one file at a time; verify `npm run typecheck` is clean and `npm run test:db` still passes against the live project (typecheck clean; **`test:db` not run**, it needs a dev server and writes to the live project)
- [x] 7.4 Check `create_order`'s RPC arguments and return are typed by the generated `Database`; verify a deliberately wrong argument name is a type error, then remove it (`p_customer_wrong` gave TS2353 naming the four real arguments; reverted)

## 8. Verification

- [ ] 8.1 Run `npm test`, `npm run build`, `npm run test:e2e` and `npm run test:db`; verify all four pass (`npm test` 236 tests pass, `npm run build` passes, `npm run lint` is 0 errors and 0 warnings; **`test:e2e` and `test:db` not run**, they need a dev server and the live project)
- [ ] 8.2 Check the storefront is unchanged: the shop page, search, paging, the panel and a placed order on a dev server; verify nothing a visitor sees differs
- [x] 8.3 State the `db:types` and `lint` scripts in `README.md` and `AGENTS.md`, including when to regenerate the types; verify the instructions name scripts that exist
- [ ] 8.4 Update `handoff.md` and `tasks.md` with what shipped, what was measured and what was decided
