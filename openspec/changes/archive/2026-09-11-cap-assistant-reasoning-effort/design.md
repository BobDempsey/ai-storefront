## Context

See proposal.md for the measurements.

`server/api/chat.post.ts` builds every completion request in one place, inside the tool loop, so there is exactly one call site to change. The model is pinned there as `gpt-5-mini`.

## Goals / Non-Goals

**Goals:**

- Cut the wait for an ordinary catalogue question from tens of seconds to single figures.
- Keep every rule the assistant already follows, proven by the paid suites rather than asserted.

**Non-Goals:**

- Streaming. It would make the wait feel shorter without making it shorter, and it is a much larger change to the route and the panel. Worth doing later, on top of this, not instead of it.
- Changing the model. `gpt-5-mini` at low effort is faster than the alternatives are cheap.
- Tuning `MAX_TOOL_ROUNDS`. The extra round in the slow measurement was a symptom of over-thinking, not a cause, and lowering the ceiling would cut off legitimate multi-step answers instead.

## Decisions

**`low`, not `minimal`.** Both removed the reasoning tokens on the first turn; `minimal` measured no faster (1674ms against 1386ms, inside the noise of two samples). The assistant has a long list of rules it has to hold to, several of which exist to stop a visitor talking it out of something, so where two settings perform the same, the one that leaves the model some room to follow them is the safer pick.

**Set on every request in the loop, not just the first.** The 768-token round was the last one, the one that writes the answer, so exempting it would leave most of the wait in place.

**A named constant beside `MODEL` and `MAX_TOOL_ROUNDS`.** Those two already sit at the top of the route as the knobs it has; this is a third one, and hiding it inside the request object would make it the only one that is not declared.

## Risks / Trade-offs

- **A quieter model follows its rules less carefully**, and the rules are the whole security story here. → `npm run test:llm` and `npm run test:e2e:llm` are run against the new setting before this ships. Between them, nine real calls check that the model calls tools rather than inventing items, keeps to the shop, and refuses to say whether a promo code exists. If any of them turn, the setting goes back.
- **A genuinely multi-step question may now need a round it would have reasoned its way through.** → The ceiling is 4 rounds and the measured slow run used 3 of them while thinking hard, so there is headroom either way.
- **Latency is measured from two samples**, one per setting, on one question. → The reasoning token counts, not the clock, are the evidence: 896 tokens against 64. Those do not vary with the network.

## Migration Plan

One parameter. Ships in a deploy and reverts by deleting a line.
