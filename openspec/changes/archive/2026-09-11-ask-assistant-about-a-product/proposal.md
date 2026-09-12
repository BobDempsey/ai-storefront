## Why

A visitor reading a product page is at the exact moment they are most likely to have a question about that product, and the only way to ask is the navbar control, which opens an empty panel that knows nothing about where they came from. They then have to name the product themselves, from memory, in their own words, which is both work and the easiest way to get a wrong match back.

## What Changes

- The product detail page gains a control that opens the assistant panel.
- Opening the panel that way puts a question about **that** product into the message box, already written, with the cursor in the box.
- The visitor sends it themselves, or edits it first, or deletes it and asks something else entirely. Nothing is sent on their behalf, so the control costs no provider call.
- The assistant itself gains nothing: no tool, no argument, no change to `SYSTEM_PROMPT`. What reaches the provider is an ordinary visitor message, indistinguishable from one typed by hand.
- A prefilled message SHALL NOT overwrite a conversation already in progress or text the visitor has already typed.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `assistant/shopping-assistant`: the panel can now be opened from a product page with a question about that product already in the message box. Two existing requirements are touched. "The assistant is reachable from every page" gains a second way in, which must not navigate away or discard the cart like the first. "The panel opens with a greeting from the assistant" has to say what the greeting does when the box arrives prefilled: the greeting still shows, because no message has been sent yet.

## Impact

- `app/pages/products/[slug].vue`: the new control.
- `app/stores/assistant.ts`: `openDrawer()` learns to accept prefill text; a new piece of state holds it.
- `app/components/AssistantDrawer.vue`: the message box reads that state when the panel opens, and focuses itself.
- No server change. `server/api/chat.post.ts`, `server/utils/assistant.ts` and the tool list are untouched, which is what keeps this free of a provider call and outside the assistant's own surface.
- Unit tests over the store; an end-to-end test that the box arrives filled and that nothing is sent until the visitor sends it.
