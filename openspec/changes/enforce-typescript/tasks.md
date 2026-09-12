## 1. See the size of the problem first

- [x] 1.1 Add `typescript` and `vue-tsc` as dev dependencies with `npm install --legacy-peer-deps`; verify `npx nuxt typecheck` runs rather than asking for a checker
- [x] 1.2 Run the check over the repo as it stands and write the full list of errors into the change folder before fixing anything; verify the list is complete by running it twice and getting the same count
- [x] 1.3 If that list holds errors this change did not anticipate, stop and agree what is in scope before continuing; verify by naming each error's file in the notes

## 2. The command

- [x] 2.1 Add `"typecheck": "nuxt typecheck"` to `package.json`; verify `npm run typecheck` reports the same result as the direct call
- [x] 2.2 Keep the fast inner loop available as `"test:unit": "vitest run"`, and make `"test"` run the typecheck and then the unit tests; verify a deliberate type error fails `npm test` before any test output appears, then remove it
- [x] 2.3 Time `npm test` before and after and record both in the change notes; verify the typecheck's share is seconds rather than tens of seconds, and if it is not, move it to a separate script and say so in the notes (13s typecheck, 3s units, 14s together; kept in `npm test`, with `test:unit` for the loop)

## 3. Replace the escapes

- [x] 3.1 Add a narrowing helper in `app/utils/errors.ts` for what `$fetch` throws: the `statusMessage` a handler shows and the promo data the checkout reads; verify unit tests cover a real H3 error, a plain `Error` and a thrown string
- [x] 3.2 Rewrite the four `catch (error: any)` handlers in `AssistantDrawer.vue`, `EmailOptinForm.vue`, `checkout.vue` and `contact.vue` as `catch (error: unknown)` through that helper; verify `npm run typecheck` passes and the existing suites stay green
- [x] 3.3 Rewrite the `catch (error: any)` in `app/stores/assistant.ts` the same way; verify the assistant unit tests still pass
- [x] 3.4 Type the `messages: any[]` in `server/api/chat.post.ts` as the OpenAI SDK's own message union; verify `npm run typecheck` passes and `npm run test:llm` still completes a real tool round (**typecheck and build verified; `test:llm` NOT run, since it spends provider calls - run it before the next deploy**)
- [x] 3.5 Confirm no `any` is left in `app/` or `server/`; verify with a grep for `: any`, `as any`, `@ts-ignore` and `@ts-expect-error` across both trees

## 4. Say so

- [x] 4.1 State in `README.md` that `npm test` typechecks as well as testing, and how to run the check alone; verify by reading the section back against the scripts
- [x] 4.2 Add the typecheck to `AGENTS.md` where it says what to run before finishing work; verify the instruction names the script that exists

## 5. Verification

- [x] 5.1 Run `npm test`, `npm run build`, `npm run test:e2e` and `npm run test:db`; verify all four pass
- [x] 5.2 Check the storefront is unchanged: load the shop page, search, page, and open the assistant panel on a dev server; verify nothing about the behaviour differs
- [x] 5.3 Update `handoff.md` and `tasks.md` with what shipped and what was decided
