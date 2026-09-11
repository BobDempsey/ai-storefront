## Context

See proposal.md for motivation. The shape of the code decides what is testable
and how:

- `runTool(name, rawArgs, context)` in `server/utils/assistant.ts` is an
  ordinary exported function taking a JSON string and a context object. It
  reaches the database through the auto-imported `useSupabase()` and through
  `getSaleState()`, both of which the existing `tests/unit/setup.ts` can stub.
- `mintConfirmation`, `spendConfirmation` and `outstandingConfirmations` in
  `server/utils/confirmations.ts` are pure module state with no I/O. The third
  exists as a test seam already.
- The provider call, the tool loop and the three guards live inside the handler
  in `server/api/chat.post.ts`. A Nitro event handler is not importable in
  isolation, so anything about the route has to go through HTTP.
- The suite established by `add-test-suite` splits by what a test needs to be
  true: `npm test` touches nothing, `test:db` needs the live database and a dev
  server, `test:smoke` needs the deploy. This change follows that split.

## Goals / Non-Goals

**Goals:**

- Cover the rules that make a language model safe to expose, at zero cost per
  run, so they are checked on every save rather than when someone remembers.
- Keep the one part that spends money and depends on a third party isolated in
  its own script.
- Leave the assistant's production code untouched.

**Non-Goals:**

- Deterministic assertions about model output. The live tests assert on
  structure, never on wording.
- Testing the OpenAI SDK. The provider call is either stubbed or real; there is
  no third option worth building.

## Decisions

**`runTool` is tested directly, with the database stubbed.** It is where every
guarantee in the proposal is actually enforced, and it is a plain function.
Going through the route instead would spend a provider call to reach code that
an ordinary call reaches for free, and the failure would point at the route
rather than the rule that broke.

**The stub grows a table-aware query builder rather than one canned answer.**
The existing `useSupabaseReturning` resolves on `maybeSingle()`, which suits
`promo.ts`. The assistant's tools also use `.order()` and read arrays, and
`findBySlug` and the catalogue search hit the same `products` table expecting
different shapes. The builder therefore has to resolve on await as well as on
`maybeSingle()`, and `getSaleState` is stubbed separately so a sale can be
turned on without inventing a `store_settings` row for every test.

**Route guards are tested against a dev server started with the key blanked.**
`NUXT_OPENAI_API_KEY= npm run dev` is enough to prove the 503, and it costs
nothing because no key means no call. This needs its own server on a second
port so it does not disturb the one `test:db` and `test:e2e` share; the test
starts it, waits for it, and stops it.

An alternative was rejected: temporarily editing `.env`. A test that edits the
developer's credentials file and restores it in teardown loses the credential
the moment the run is killed.

**The 25-message cap is checked against the ordinary dev server.** It is
refused by Zod before the key is read, so it needs neither a provider call nor
the blanked-key server.

**The live tests assert structure, not prose.** "What do you sell?" must come
back with a non-empty reply and no intents; "add the articulated dragon to my
cart" must come back with one intent whose `productId` is a real catalogue id.
Both hold for any wording the model chooses, and both fail if the tool loop,
the slug resolution or the intent path breaks.

**A live test that fails on a provider outage is a failed test, not a skipped
one.** It runs only when someone asks for it with `npm run test:llm`, so a red
result there is information rather than noise.

## Risks / Trade-offs

- **The database stub can drift from what Supabase actually returns**, and a
  test passing against a wrong stub is worse than no test. → The `runTool`
  tests assert on the values `present()` produces from rows shaped like the
  real `products` columns, and `tests/db` continues to exercise the real client
  for the order path.
- **Two dev servers on two ports invite a port collision** with whatever the
  developer already has running. → The blanked-key server binds a port of its
  own and the test fails with a clear message if it cannot.
- **The live tests cost money on every run**, however little. → They are opt-in,
  there are two or three of them, and `gpt-5-mini` is the cheap model the app
  already uses.
- **A future model revision could stop calling the tool** for the add-to-cart
  phrasing, failing a test for a reason that is nobody's bug. → That is the
  signal worth having: the assistant would have stopped working, and the test
  would be the only thing that noticed.
