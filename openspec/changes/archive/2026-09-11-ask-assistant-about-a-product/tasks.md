## 1. The store carries the prefill

- [x] 1.1 Add a `prefill` string to the assistant store's state and let `openDrawer()` take an optional text argument that sets it, verifying with a unit test that calling it with text leaves `prefill` set and calling it without leaves the previous value alone
- [x] 1.2 Add an action that empties `prefill`, and verify with a unit test that it does so without touching `open`, `messages` or `showDot`
- [x] 1.3 Verify with a unit test that `openDrawer()` with text still clears the attention dot and still asks `/api/chat` whether the assistant is available, so the new argument changes nothing else

## 2. The drawer consumes it

- [x] 2.1 Watch `assistant.open` in `AssistantDrawer.vue` and, on the transition to true, copy `prefill` into the local `input` ref and clear the store's copy, verifying by opening the panel with a prefill set and seeing the text in the box
- [x] 2.2 Guard the copy on all three conditions from design.md (prefill non-empty, `input` empty, conversation empty) and verify each guard: a half-typed message survives, a conversation in progress survives, and an empty box with no conversation takes the text
- [x] 2.4 Drop the conversation guard, keeping only the empty-box one, and verify that asking about a second product mid-conversation puts the new question in the box with the earlier conversation intact beneath it
- [x] 2.3 Focus the message box and put the cursor at the end when a prefill lands, and verify that opening with an empty box does not steal focus

## 3. The product page asks

- [x] 3.1 Add a control to `app/pages/products/[slug].vue` that calls `openDrawer()` with a one-sentence question built from `product.name`, verifying on a running dev server that the panel opens with that product named in the box
- [x] 3.2 Verify the control reads clearly beside the existing Add to cart button in both colour schemes and at 390px width

## 4. Prove it costs nothing and changes nothing

- [x] 4.1 Verify on a running dev server, with the network panel open, that clicking the control makes no request to the chat completion route and that the greeting is still shown above the prefilled box
- [x] 4.2 Add an end-to-end test covering the path from a product page to a filled message box, asserting no message has been sent, and verify `npm run test:e2e` passes without a provider call
- [x] 4.3 Verify `tests/unit/assistant-promo-boundary.test.ts` still passes, pinning that the tool list is unchanged

## 5. Finish

- [x] 5.1 Verify `npm test`, `npm run build` and `npm run test:e2e` all pass
- [x] 5.2 Record the change in `handoff.md`, including why the question is not sent automatically and why a prefill yields to the visitor's own words
