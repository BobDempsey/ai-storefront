## 1. Test scaffolding

- [x] 1.1 Extend `tests/unit/setup.ts` with a `products`-aware query stub that resolves on await as well as on `maybeSingle()`, and verify an existing promo test still passes unchanged
- [x] 1.2 Add a `getSaleState` stub so a test can turn the store-wide sale on without inventing a `store_settings` row, and verify a tool result carries sale pricing when it is on and catalogue pricing when it is off

## 2. The read tools

- [x] 2.1 Test `search_catalogue` with no term, a matching term, a term matching nothing (returns the whole catalogue, not an error) and a `kind` filter; verify each
- [x] 2.2 Test `get_product` for a real slug and an invented one, and verify the invented slug returns the "does not have that item" error rather than inventing a product
- [x] 2.3 Test `get_cart` for an empty cart, a priced cart, and that a digital line always reports available; verify the subtotal matches the lines
- [x] 2.4 Test that every tool returns `{ error }` for malformed JSON arguments and for arguments its Zod schema rejects, and verify none of them throws

## 3. The cart-change tool

- [x] 3.1 Test `propose_cart_change` pushes exactly one intent for a valid add, and verify the intent's `productId` is the id the database returned, not anything supplied in the arguments
- [x] 3.2 Test an invented slug and an out-of-stock physical product are both refused with no intent pushed; verify `context.intents` stays empty
- [x] 3.3 Test a digital item is capped at quantity 1 with the explanatory note, and a physical quantity is clamped to 1..99; verify the clamped values
- [x] 3.4 Test `remove` produces quantity 0, and verify the storefront-facing fields (`action`, `name`, `single`) are all present

## 4. Drafting an order

- [x] 4.1 Test `draft_order` refuses an empty cart and a cart holding an unavailable line, naming the line, and verify no draft is set on the context
- [x] 4.2 Test a valid draft sets `context.draft` with the customer, the priced lines and the total, and verify the total equals the sum of the lines
- [x] 4.3 Verify the tool's returned result contains no confirmation value anywhere, since that result is what goes into the history the provider sees

## 5. One-time confirmations

- [x] 5.1 Test a minted confirmation is spent exactly once and verify `outstandingConfirmations()` drops back to zero
- [x] 5.2 Test a replay, an unknown value, a non-string and `undefined` are each refused; verify all four return false
- [x] 5.3 Test an expired confirmation is refused, using fake timers to pass the 15-minute TTL, and verify the sweep removes it

## 6. Route guards

- [x] 6.1 Add a helper that starts a dev server with `NUXT_OPENAI_API_KEY` blank on a port of its own and stops it in teardown; verify it fails with a clear message if the port is taken
- [x] 6.2 Test `POST /api/chat` answers 503 against that server and verify no provider call is made and no key appears in the response body
- [x] 6.3 Test a history of 26 messages is refused with 400 against the ordinary dev server, and verify the message tells the visitor to start a new conversation
- [x] 6.4 Verify the assistant's `chat:` bucket is independent of the order bucket by exhausting neither: assert the key shape in `chat.post.ts` matches what `tests/unit/rate-limit.test.ts` covers

## 7. Live provider tests

- [x] 7.1 Add `vitest.llm.config.ts` and a `test:llm` script covering `tests/llm/**`, kept out of `npm test`; verify `npm test` still reports only the unit files
- [x] 7.2 Add a live test asking a plain catalogue question, and verify a non-empty reply comes back with no intents and no draft
- [x] 7.3 Add a live test asking to add a named product, and verify exactly one intent comes back whose `productId` is a real catalogue id
- [x] 7.4 Run `npm run test:llm` and record the actual cost of one run in the handoff, so the next agent can judge it rather than guess

## 8. Wrap up

- [x] 8.1 Run `npm test`, `npm run test:db`, `npm run test:e2e` and `npm run test:smoke` and verify the existing suites still pass unchanged
- [x] 8.2 Record the new script and what it costs in `handoff.md`, and confirm the assistant's remaining untested gap (the 75-per-day cap) is still listed there
