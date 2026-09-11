## Why

A visitor who orders through the assistant cannot use a promo code. The draft
card collects their name, email, phone and notes, but there is no promo field on
it, so a visitor holding a code has to abandon the drawer and start again at
checkout. The code they were emailed works everywhere except the path the shop
built to make ordering easier.

The reason it was left out is on the record and still holds: the assistant is
given no way to touch a code, and is never told one, so a model that is talked
into anything cannot produce a discount. This change closes the gap without
reopening that, by putting the code where the visitor's other details already
are — on the draft card, in the browser — rather than into anything the model
reads or writes.

## What Changes

- The draft card in the assistant drawer gains a promo code field beside the
  details it already collects, behaving as the checkout page's field does:
  apply, see the total change, clear a refused code.
- Applying a code on the draft card re-prices the draft through the existing
  cart preview, using the email already on the card, and shows the reduced total
  and the code's percentage.
- Confirming a draft sends the code along with the confirmation the drawer
  already holds. `create_order` resolves it exactly as it does for a checkout
  order, so the code is priced, recorded and redeemed by the same transaction.
- The assistant's standing instruction changes by one sentence: it may now say a
  code can be applied on the draft card, instead of sending the visitor to the
  checkout page. It gains no tool, no argument and no knowledge of any code.
- **No new tool.** The assistant's tool list is unchanged, which is what keeps
  "the assistant's permissions are its tool list" true.

No Supabase schema or RLS change. No new environment variable. `create_order`,
`/api/orders` and `/api/cart/preview` already accept everything this needs.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `assistant/shopping-assistant`: two requirements change. "The assistant can
  explain promo codes but never handle one" keeps every prohibition and updates
  where it points the visitor. "A drafted order carries no promo code" becomes
  the rule that a draft carries the code the visitor typed into the card and no
  other, and that the model neither supplies nor sees it.
- `promotions/promo-code`: one requirement added, covering the drawer as a
  second place a code is entered — one redemption per email address however the
  order was placed, and no path by which the assistant can test, guess or
  enumerate codes.

## Non-goals

- **The assistant does not get a promo tool, now or as a consequence of this.**
  It cannot read, list, create, alter, activate, deactivate, test or apply a
  code. Every prohibition in the existing requirement survives this change.
- **The assistant is never told a code**, including one the visitor typed on the
  card. The field's value stays in the browser and goes to the server on the
  same requests the checkout page already makes; it never enters the message
  history, a tool argument or a tool result.
- **No code typed into the chat box is honoured.** If a visitor types a code at
  the assistant, it tells them where the field is rather than acting on it.
  Honouring it would mean the model handling a code, which is the thing being
  avoided.
- **No stacking, and no change to how a code and a sale resolve.** The better of
  the two still wins, decided in `create_order`.
- **No change to who may redeem.** One redemption per email address, enforced by
  the same unique index whichever path the order came from.
- **No assistant-side pricing.** The draft's total stays advisory, as it is
  today; `create_order` prices the order at submit.

## Impact

- `app/components/AssistantDrawer.vue` — the promo field, its apply call, and
  the code travelling with the confirmation on submit. Most of the change.
- `server/utils/assistant.ts` — one sentence of the system prompt. No change to
  `TOOL_NAMES`, `TOOLS` or `runTool`.
- `tests/unit/` — that the tool surface is unchanged, and that a drafted order
  still carries nothing the model supplied.
- `tests/e2e/` — a code applied on the draft card through to a placed order.
- No server route changes, no migration, no new dependency.
