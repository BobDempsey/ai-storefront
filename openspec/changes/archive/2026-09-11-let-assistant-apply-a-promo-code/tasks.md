No migration and no new environment variable. This change adds no Supabase
schema or RLS change, and no server route changes: `/api/cart/preview` and
`/api/orders` already accept everything it needs.

## 1. The promo field on the draft card

- [x] 1.1 Add a promo code field with an Apply button to the draft card in `app/components/AssistantDrawer.vue`, beside the details it already collects, disabled while the draft is submitting, and verify it renders on a draft and not on an empty panel
- [x] 1.2 Wire Apply to `/api/cart/preview` with the cart, the typed code and the email on the card, and verify a valid code shows the reduced total and the code's percentage on the card
- [x] 1.3 Show the refusal message for each of `unknown`, `inactive` and `used`, in the same words the checkout page uses, and verify each renders and reverts the card to the undiscounted total
- [x] 1.4 Clear the field and the applied code on any status other than `applied`, matching the checkout fix in `6c70104`, and verify a rejected code cannot sit in the field for a following Confirm to resend
- [x] 1.5 Send the applied code with the confirmation in `confirmDraft`, and verify the request body carries the code the visitor typed and nothing else new
- [x] 1.6 Verify the field renders correctly in dark mode, including the success and error text, against the layout's `bg-surface-0 dark:bg-surface-900` convention

## 2. What the assistant is told

- [x] 2.1 Change the one `SYSTEM_PROMPT` sentence in `server/utils/assistant.ts` to name the draft card as well as the checkout page, leaving every prohibition around it unchanged, and verify the diff touches that sentence alone
- [x] 2.2 Verify by unit test that `TOOL_NAMES` and the `TOOLS` definitions are unchanged by this change, so no promo tool was introduced
- [x] 2.3 Verify by unit test that no tool result `runTool` can produce contains a promo code or a code-shaped argument

## 3. Tests

- [x] 3.1 Add unit tests that a drafted order carries no code unless one was entered, and that `draft_order` accepts no code argument, and verify `npm test` passes
- [x] 3.2 Add a database test placing an order through the drawer's own request shape — cart, confirmation and code — and verify it prices and records the redemption identically to the same code at checkout
- [x] 3.3 Add a database test that a code redeemed through the drawer is refused at checkout for the same email address, and the reverse, and verify both directions — **done as one test, not two.** Both entry points post the same body to the same route, so there is no direction the database can tell apart. Two identically-shaped tests with different names would have asserted nothing extra; `tests/db/drawer-promo.test.ts` says this in a comment.
- [x] 3.4 Add a Playwright test covering a code applied on the draft card through to a placed order, and verify `npm run test:e2e` passes
- [x] 3.5 Add a live assistant test (`tests/llm/`) that a code typed into the chat box is not acted on and the assistant points at the field, and verify it does not re-price the draft
- [x] 3.6 Add a live assistant test that asking it to check or guess codes gets the same reply whether or not the code exists, and verify no code is named
- [x] 3.7 Run `npm test`, `npm run test:db` and `npm run test:e2e` and verify nothing that passed before now fails

## 4. Verify end to end and record it

- [x] 4.1 Place a real order through the drawer with a valid code against a running `npm run dev`, and verify the recorded total, the redemption row, and that the buyer confirmation and staff email both name the code
- [x] 4.2 Attempt the same code from the same address at checkout afterwards and verify it is refused as already used
- [x] 4.3 Delete the test orders, their items and redemptions, and verify `orders` holds none of them and the code is released
- [x] 4.4 Run `npm run build` and verify it passes
- [x] 4.5 Update `handoff.md`: the decision in section 3 that the assistant gets no promo tool now reads as still true but differently scoped, and section 10's parked item is done
