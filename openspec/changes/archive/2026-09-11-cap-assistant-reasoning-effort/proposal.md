## Why

A single question to the assistant takes about 29 seconds to answer, and the panel shows nothing at all while it does. Measured against `gpt-5-mini` with the route's own prompt and tool list, one message ("What dice towers do you have?") spent 3.4s, 4.5s and 21.1s across three rounds, burning 64, 64 and 768 reasoning tokens. The database leg of the same turn is about 0.2s warm, so the wait is the model thinking, not the shop being slow.

The route has never set `reasoning_effort`, so it takes the model's default. The same question at `reasoning_effort: 'low'` answered in 6.4 seconds over two rounds, with the same tool called and no reasoning tokens spent on the first turn. The extra round in the slow run is the more interesting half of that: thinking harder led the model to look things up again rather than answer.

## What Changes

- The chat route SHALL ask the provider for low reasoning effort on every completion it requests.
- No change to the tool list, `SYSTEM_PROMPT`, the message cap, the daily cap or the rate limiter.
- The assistant's rules are unchanged and still have to hold at the lower setting, which is what the paid test suites are for.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `assistant/shopping-assistant`: one requirement, "The assistant is capped and can be turned off", gains a bound on how long a visitor waits and states that the reply must arrive without the visitor being left staring at nothing. The rules the assistant already follows are unchanged in wording, but they now have to hold at a lower reasoning setting, so their scenarios are what guard this change.

## Impact

- `server/api/chat.post.ts`: one parameter on the completion request.
- No browser change, no schema change, no environment variable.
- `npm run test:llm` and `npm run test:e2e:llm` are the verification: they already check that a real model calls the tools, keeps to the shop, and refuses to say whether a promo code exists. Those nine provider calls are what tell us the lower setting did not cost us the rules.
- Cost falls with the latency, since reasoning tokens are billed as output. That is a side effect, not the reason.
