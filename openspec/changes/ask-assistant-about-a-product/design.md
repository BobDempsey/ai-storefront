## Context

See proposal.md for motivation.

Two facts about the existing code shape the approach. The panel is a single `AssistantDrawer` mounted by the default layout, not one instance per page, so the product page cannot reach into it directly and has to go through the store. And the message box is a component-local `const input = ref('')` inside that drawer rather than store state, which is why text a visitor typed already survives a close and reopen today. Any prefill has to respect that, not trample it.

`openDrawer()` in `app/stores/assistant.ts` already does two things on open: sets `open`, clears the attention dot, and asks `/api/chat` whether the assistant is configured. The new behaviour hangs off the same call.

## Goals / Non-Goals

**Goals:**

- A product page can open the panel with a question about that product waiting in the box.
- The visitor's own words always win over a prefill.
- No provider call and no change to what the provider is offered.

**Non-Goals:**

- Giving the assistant knowledge of which page the visitor is on. It learns the product from the words of the question, exactly as it would if the visitor had typed them.
- Sending the question automatically. That was considered and rejected with the user: it would spend one of the day's 75 requests on every click, including the accidental ones.
- Any change to `SYSTEM_PROMPT`, the tool list, or the chat route.

## Decisions

**The prefill travels as store state, not as a route query or an event.** `openDrawer()` takes an optional string and the store holds it in a `prefill` field until the drawer picks it up. A query parameter was the alternative and is worse in three ways: it changes the URL of a product page that is meant to be shareable, it survives a reload so the box refills itself unasked, and it puts visitor-facing text somewhere a search engine can index. An event bus was also considered; the store is already the channel between the page and the drawer for everything else, so a second mechanism earns nothing.

**The drawer consumes the prefill and the store clears it.** The drawer watches `assistant.open`, and on the transition to true copies `prefill` into `input` and calls a store action that empties `prefill`. Consuming it on open rather than on close means a visitor who opens from one product, closes, and opens from the navbar does not get the first product's question back.

**Two conditions guard the copy**: the prefill is non-empty and `input` is empty. The second protects a half-typed message, which is the visitor's own and must not be replaced.

A third condition was tried and removed: the conversation also had to be empty, on the reasoning that a question about a different product appearing mid-thread would read as the assistant having lost the plot. In use it read the other way round. Asking about one product, then browsing to a second and asking about that one is the ordinary path, and under that guard the second click opened a panel with an empty box and nothing to explain why. Careful was indistinguishable from broken. The conversation stays where it is; the new question sits in the box above it.

**The question is written by the page, from the product's own name.** `app/pages/products/[slug].vue` already has the product loaded, so the text is built there and the store stays ignorant of the catalogue. One sentence, in the visitor's voice, naming the product exactly as the page does.

**The box takes focus when the panel opens with a prefill.** Without it the visitor sees text they did not type and no obvious way to act on it. With focus and the cursor at the end, editing or sending is the next keystroke. Focus is not moved when the panel opens with an empty box, which is today's behaviour and stays.

## Risks / Trade-offs

- **A visitor may read the prefilled text as a message the assistant already received.** → The greeting is still shown above it, the send button is still unpressed, and the text sits in a box with a cursor in it. The spec pins the greeting being present for this reason.
- **The question and the catalogue can drift**, if the page ever stops passing the product's real name. → It is built from `product.name`, the same value the heading renders, so the two cannot disagree without the page being visibly wrong.
- **A prefill that is silently dropped could confuse.** A visitor clicks the button with a half-typed message in the box and nothing appears. → Judged the lesser harm: the alternative throws away words they wrote. The panel still opens, so the click is not inert. The same reasoning was first applied to a conversation in progress and was wrong there; see the Decisions section.
- **One more thing to keep in step with the homepage copy**, which lists what the assistant can do. → The button asks a question rather than claiming a capability, so no list has to change.

## Migration Plan

No schema change, no environment variable, no server change. Ships in one deploy and rolls back with one.
