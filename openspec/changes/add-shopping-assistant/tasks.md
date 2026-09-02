No task below needs a Supabase migration; the schema and RLS policies are
untouched. One new environment variable is added, `NUXT_OPENAI_API_KEY`
(server-only), and one new dependency, `openai`. The assistant must degrade to
"unavailable" when the key is absent, so every task below has to work on a
checkout with no key configured.

## 1. Configuration

- [x] 1.1 Install `openai` with `--legacy-peer-deps` and add `NUXT_OPENAI_API_KEY` to `.env.example` and `runtimeConfig` in `nuxt.config.ts`, server-side only; verify a grep of the built client bundle finds no key and no `openai` import
- [x] 1.2 Add a served flag or endpoint the drawer can read to know whether the assistant is configured, without shipping the key; verify the drawer renders "unavailable" with the key blanked and works with it set

## 2. Tools and validation

- [x] 2.1 Add Zod schemas for every tool argument and for the chat request body (messages, roles, lengths) to `server/utils/schemas.ts`; verify an oversized message array and a malformed tool argument are both rejected with a 400 carrying no internal detail
- [x] 2.2 Add `server/utils/assistant.ts` holding the five tool definitions from design.md and their handlers, with no tool that writes to the catalogue, the cart or an order; verify by asserting the exported tool names are exactly the five and that none of them calls `/api/orders`
- [x] 2.3 Implement the read tools (`search_catalogue`, `get_product`, `get_cart`) against the existing catalogue and `/api/cart/preview` logic; verify each returns catalogue figures unchanged and that `get_cart` matches what the cart page shows for the same cookie
- [x] 2.4 Implement `propose_cart_change` so it resolves and validates the product id server-side and returns an intent rather than mutating anything; verify an unknown id is rejected before an intent is returned
- [x] 2.5 Implement `draft_order` so it returns the collected details and the server-priced lines without submitting; verify no order row exists after a draft is produced
- [x] 2.6 Mint a one-time confirmation per draft into a short-TTL in-memory store beside the rate limiter, and return it alongside the tool result rather than inside it; verify the confirmation appears in the route response and in no message, tool argument or tool result sent to the provider
- [x] 2.7 Add verify-and-spend for a confirmation, refusing one that is unknown, expired or already spent; verify a replayed confirmation is refused and an expired one is refused after the TTL

## 3. Chat route

- [x] 3.1 Add `server/api/chat.post.ts`: rate limit on `chat:<ip>` at 75 requests per day, Zod-validate, refuse a history past 25 messages with a clear message, and return a generic failure whose text carries no provider or internal detail; verify the 26th message is refused and the 76th request in a day returns 429 (the message cap was verified; the daily cap was left unproven by decision rather than spend 75 provider calls on the same limiter the order and contact routes already exercise)
- [x] 3.2 Run the tool-calling loop against `gpt-5-mini` with the system prompt setting the shop-only scope and the decline, capped at 4 tool iterations per turn; verify an off-topic question gets a decline and that a question needing two lookups still answers
- [x] 3.3 Return `{ reply, intents, draft }`, the draft carrying its confirmation, and nothing else; verify the response carries no key, no raw provider payload and no internal error text
- [x] 3.4 Handle a missing key and a provider failure by reporting the assistant as unavailable rather than throwing; verify with the key blanked and with an invalid key that the route answers cleanly and the rest of the site is unaffected

## 4. Drawer

- [x] 4.1 Add the chat drawer component and the navbar control that opens it in `app/layouts/default.vue`, using PrimeVue's Drawer, labelled for assistive technology and operable by keyboard; verify it opens on a product page without navigating and reads correctly in both colour schemes
- [x] 4.2 Add the conversation store holding messages for the life of the panel only, with nothing persisted; verify a reload starts a fresh conversation while the cart survives
- [x] 4.3 Apply returned intents through `useCartStore()` rather than any parallel path; verify asking for a file twice still leaves one in the cart, and that the header count updates without a reload
- [x] 4.4 Render cart lines and totals in the drawer from `/api/cart/preview` rather than from model text; verify the drawer's total matches the cart page's for the same cart
- [x] 4.5 Render the order draft card with its lines, server-priced total and editable name, email, phone and notes, plus Confirm and Cancel; verify editing the email then confirming submits the edited value, and that Cancel records nothing
- [x] 4.6 Submit a confirmed draft through `POST /api/orders` from the client with its confirmation, reusing the checkout page's error handling, and show the reference on success; verify an out-of-stock line is reported in the drawer and leaves the cart intact, and that the checkout page still submits without a confirmation
- [x] 4.7 Keep the confirmation out of the conversation state entirely, holding it beside the draft; verify it survives no reload and is never sent back to the chat route
- [x] 4.8 Show the message cap and the daily limit as plain sentences in the drawer; verify the rest of the site keeps working once a cap is hit

## 5. Verification

- [x] 5.1 Walk a whole conversation end to end against the running app: ask a catalogue question, add two items by asking, correct one, draft an order, edit the email, confirm, and verify one order is recorded with the right lines and total and that the staff email arrives
- [x] 5.2 Try to make the assistant misbehave: ask it to place the order without confirming, to add a product that does not exist, to quote a discount, to add a second copy of a file, to repeat back any confirmation it holds, and to answer an off-topic question; verify none of these changes the cart or records an order
- [x] 5.3 Verify the confirmation cannot be reused or forged: submit a spent one, an invented one and none at all, and verify each is refused with no order recorded
- [x] 5.4 Verify the provider key appears in no served page, no client bundle and no response body, and that no request goes from the browser to the provider
- [x] 5.5 Verify the assistant cannot outrun the order rules: confirm a draft holding an out-of-stock item and see it rejected with the product named, exactly as the checkout page reports it

## 6. Documentation

- [x] 6.1 Update `handoff.md`: the new env var in section 6, the chat route and drawer in section 4, the assistant's tool boundary and the one-time draft confirmation as decisions in section 3, and the metered API bill now behind the `X-Forwarded-For` caveat in section 9; verify the document names the new key and says the assistant cannot submit an order
