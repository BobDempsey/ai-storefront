## 1. Ask for less deliberation

- [x] 1.1 Add a named reasoning-effort constant beside `MODEL` and `MAX_TOOL_ROUNDS` in `server/api/chat.post.ts`, set to `low`, and pass it on every completion the tool loop requests, verifying `npm run build` passes

## 2. Prove the rules held

- [x] 2.1 Run `npm run test:llm` against the new setting and verify all eight real calls pass, which covers tool use, staying on topic and the promo-code refusals
- [x] 2.2 Run `npm run test:e2e:llm` and verify the browser path from an assistant draft with a promo code through to a placed order still works
- [x] 2.3 Time a plain catalogue question through a running dev server and verify the reply arrives in single-figure seconds

## 4. Show the wait

- [x] 4.1 Replace the flat "Thinking..." line in `AssistantDrawer.vue` with a spinner and a label that turns to "Almost there" after about three seconds, announced through `role="status"`, and verify by holding a faked reply open in a browser
- [x] 4.2 Verify the label resets to "Thinking" for a following question rather than staying where the last one ended, and that the timer is cleared when the panel unmounts
- [x] 4.3 Add an end-to-end test over both labels with a faked reply, so it costs no provider call, and verify `npm run test:e2e` passes

## 3. Finish

- [x] 3.1 Verify `npm test` and `npm run test:e2e` still pass, neither of which spends a provider call
- [x] 3.2 Record the measurements and the choice of `low` over `minimal` in `handoff.md`
