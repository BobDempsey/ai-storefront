## Why

The `add-test-suite` change left the assistant uncovered, on the grounds that
testing it costs a provider call per run. That reasoning only holds for the
model itself. The parts most worth protecting are the ones that run before and
after the model, and they cost nothing to test.

`assistant/shopping-assistant` already requires that every fact comes from the
catalogue, that a cart change is proposed rather than applied, that only the
visitor can submit an order, and that the provider credential never reaches the
browser. Those are the rules that make it safe to put a language model in front
of a shop, and nothing checks any of them. `runTool` resolves every slug against
the database precisely so an item the model invented cannot reach the browser as
an intent; if that resolution were removed, every test in the repository would
still pass.

## What Changes

- Unit tests for `runTool` across all five tools: argument validation, slug
  resolution, an invented slug, an out-of-stock product, the one-per-order cap
  on a digital item, and that a pushed intent carries the id the database
  returned rather than anything the model supplied.
- Unit tests that `draft_order` refuses an empty cart, refuses a cart holding an
  unavailable line, and that its result contains no confirmation.
- Unit tests for `confirmations.ts`: a minted confirmation is spent once, a
  replay is refused, a forged or non-string value is refused, and an expired one
  is refused.
- Tests for the three guards on `POST /api/chat`: a 503 when no key is
  configured, a 400 when the history exceeds 25 messages, and that the
  assistant's `chat:` bucket is separate from the order bucket.
- An opt-in `npm run test:llm` making two or three real `gpt-5-mini` calls: a
  plain question answers from the catalogue, and an add-to-cart request produces
  an intent naming a real product. This is the only part that costs money and
  the only part that can fail because a provider had a bad minute, so it stays
  out of every other script.

## Non-goals

- No assertions about the wording the model produces. A test that pins phrasing
  fails on the provider's next revision and teaches nothing.
- No test of the 75-per-day cap against the provider. The limiter is unit-tested
  in `tests/unit/rate-limit.test.ts`; spending 75 calls to watch it work again
  is not worth it, and that gap stays recorded in `handoff.md`.
- No change to the assistant's behaviour, prompt, tools or routes. If a test
  cannot be written without changing production code, that is a finding to
  report, not a licence to change it.
- No transcript storage, which the assistant deliberately does not do.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None. This change declares `skip_specs: true` in its `.openspec.yaml`. Every
behaviour it covers is already a requirement in
`openspec/specs/assistant/shopping-assistant/spec.md`; the tests check what the
spec already says, so no requirement is added or altered.

## Impact

- New files under `tests/unit/` and a new `tests/llm/` directory, plus a
  `vitest.llm.config.ts` and a `test:llm` script in `package.json`.
- `tests/unit/setup.ts` gains whatever stubs the assistant tools need beyond
  the `useSupabase` builder it already provides.
- No Supabase schema or RLS change. The `runTool` tests stub the database; the
  live tests read the catalogue but write nothing, so no order rows are created
  and no cleanup is needed.
- `NUXT_OPENAI_API_KEY` is read by the live tests from `.env`, the same way the
  database tests read the Supabase credentials.
