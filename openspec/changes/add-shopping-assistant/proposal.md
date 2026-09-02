## Why

A visitor who knows what they want can already find it in six products. A
visitor who does not has no one to ask, and the shop has no staff sitting behind
the site. An assistant that reads the catalogue, edits the cart and drafts an
order gives that visitor a way through, and it costs a fraction of a cent per
conversation.

The interesting part is not the chat. It is that the same visitor can go from a
question to a submitted order without touching a product page, which is exactly
where a model has to be prevented from doing more than it should.

## What Changes

- Add a chat drawer, opened from the navbar, available on every page that uses
  the default layout.
- Add a server route that runs the conversation against the OpenAI API. The API
  key stays on the server; no key and no model call ever reaches the browser.
- Give the model a small, fixed set of tools: search the catalogue, read a
  product, read the priced cart, and propose a cart change.
- A cart tool call returns an intent. The browser applies it to the existing
  Pinia store, so the cart stays exactly where the rest of the app expects it.
- Let the assistant collect the customer's name and email and draft an order.
  Submitting that draft requires one explicit confirmation from the visitor, in
  the drawer. The model cannot submit on its own.
- Issue a one-time confirmation with each draft, held by the storefront and
  returned by the visitor's click. The assistant never receives it, so a future
  version that submits on the visitor's behalf still cannot submit unattended.
- On confirmation, the draft goes through the existing `POST /api/orders`, so
  pricing, validation, stock checks and the staff email are unchanged.
- Keep the assistant on the shop. Anything off topic gets a short decline in the
  drawer, and the conversation carries on there. Nothing navigates the visitor
  away.
- Start every conversation fresh. Closing the drawer or reloading the page
  clears it; nothing is persisted anywhere.
- Let the visitor edit the drafted order before confirming it, not only accept
  or cancel it. The assistant tells them phone and notes can be included, both
  optional as they are on the checkout form.
- Cap a conversation at 25 messages, and an IP at 3 conversations a day, on the
  limiter the order and contact routes already use.

## Non-goals

- **No new order path.** The assistant submits through `/api/orders` and nothing
  else. `create_order` stays the only thing that prices an order.
- **No model-generated prices or totals.** Every figure shown to a visitor comes
  from the catalogue or from `/api/cart/preview`. If the model states a price in
  prose it is a bug, not a feature.
- **No server-side cart.** The cart stays a browser store persisted to a cookie.
  Moving it server-side would reverse a settled decision and touch every page.
- **No accounts, no identity.** Unchanged from phase 1. The assistant knows
  nothing about who it is talking to beyond what they type.
- **No stored conversations.** Nothing is written to Supabase and nothing
  survives a reload, which means no transcript to consult when an order looks
  wrong. Accepted for now.
- **No general-purpose assistant.** It talks about this shop. A question about
  anything else gets a decline, not an answer, because a free model behind a
  public text box is an invitation.
- **No `/chat` page.** The drawer is the whole surface.
- **No streaming responses** in this change. A tool-calling loop that also
  streams is more moving parts than the first version needs.
- **No catalogue writes, no admin actions, no staff-facing assistant.** The
  model cannot change a product, a price, stock, or an existing order.
- **No images, no voice, no file upload.**

## Capabilities

### New Capabilities

- `assistant/shopping-assistant`: what the assistant may do on a visitor's
  behalf, what it must never do, how a cart change reaches the cart, and what
  has to be true before an order is submitted.

### Modified Capabilities

None. `ordering/cart-availability` and `ordering/failure-reporting` hold as
written, and the assistant is bound by them: it reaches the database through the
same routes, so an out-of-stock line blocks its order exactly as it blocks a
person's.

## Impact

**No Supabase schema or RLS change.** The assistant reads the catalogue through
existing routes and writes nothing the storefront cannot already write.

**New environment variable**: `NUXT_OPENAI_API_KEY`, server-only, alongside the
existing `NUXT_` secrets. A missing key must degrade to the drawer saying the
assistant is unavailable, never to a broken page.

**New dependency**: the `openai` package.

**Model**: `gpt-5-mini`, chosen for tool-call reliability at $0.25 per million
input tokens and $2.00 per million output. `gpt-5-nano` is cheaper and is where
tool-calling gets unreliable first, and an unreliable tool call here is a wrong
order rather than a wrong sentence.

Code:

- `server/api/chat.post.ts`, the conversation and tool loop
- `server/utils/assistant.ts`, the tool definitions and their handlers
- `server/utils/schemas.ts`, Zod schemas for every tool argument
- `server/utils/rate-limit.ts`, reused with a `chat:` prefix
- `app/components/`, the drawer, the message list and the order draft card
- `app/layouts/default.vue`, the navbar control that opens it
- `app/stores/`, the conversation state, which applies cart intents
- `nuxt.config.ts` and `.env.example`, for the new key
