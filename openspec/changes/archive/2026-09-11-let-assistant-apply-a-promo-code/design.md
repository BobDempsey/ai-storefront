## Context

See proposal.md for motivation.

Three facts about what exists decide almost everything here.

`app/components/AssistantDrawer.vue` already owns the draft card as a real form.
It copies the draft's customer details into its own editable `form`, posts to
`/api/orders` in `confirmDraft` with the confirmation the drawer holds, and
separately calls `/api/cart/preview` to show the priced cart. The card is
already the place the visitor types, and already the thing that submits.

`/api/cart/preview` already takes a `promoCode` and an `email` and reports a
`promoStatus`, and `/api/orders` already accepts a `promoCode` alongside a
`confirmation` — `orderSchema` has both fields today. The checkout page uses
exactly these two calls to do exactly this job. So the server needs no new
route, no new field and no new validation.

`server/utils/assistant.ts` prices a draft through `priceCart` with the sale
state only, and the draft's total has always been advisory: `create_order`
prices the order at submit, from the catalogue. A code changing the number on
the card therefore changes nothing about where pricing authority sits.

## Goals / Non-Goals

**Goals:**

- Put the code where the visitor's other details already are, so that the model
  is not in the path at all rather than being in the path and restrained.
- Reuse the checkout page's two calls verbatim, so the two entry points cannot
  drift into pricing a code differently.
- Leave the assistant's tool list byte-identical, because that list is the
  security argument.

**Non-Goals:**

- Sharing a component between the checkout page's promo field and the drawer's.
  See the decision below.
- Any server-side memory of a code mid-conversation.

## Decisions

**The field lives on the draft card, and its value never leaves the browser
except on the two requests the checkout page already makes.** This is the whole
design. The alternative — the visitor types the code in chat, the model reads it
and passes it to a tool — was rejected for two reasons. It puts a code into the
message history, which breaks the standing guarantee that the assistant is never
told a code, and it hands the model a parameter that a prompt injection can
choose. Bounded damage is still damage worth not having: with no tool that takes
a code, there is no argument to poison.

**No new tool, and `TOOL_NAMES` does not change.** The repository's stated
security model is "the assistant's permissions are its tool list". The moment a
promo tool exists, that sentence needs a footnote. A test asserts the list is
unchanged, so a future change that adds one has to do it deliberately.

**The code is not sent to the chat route at all.** Not as a field on the request,
not as context, not as a redacted placeholder. The chat route has no reason to
know an order will carry a code, and a value the route never receives cannot
leak into a prompt by accident later.

**Reuse `/api/cart/preview`, not a new endpoint.** It already prices a cart with
a code against an email and reports `promoStatus`. The drawer has the email on
the card. Building a draft-specific preview would be a second implementation of
the one thing that must not differ between the two paths.

**A refused code clears the field, matching `6c70104`.** The checkout page had a
bug where a rejected code stayed in the field and got resent on the next submit,
and the fix was to clear it on any status other than `applied`. The drawer is
about to grow the same field, so it gets the same rule from the start rather
than the same bug.

**Duplicate the field rather than extract a shared component.** The checkout
page's promo block is about fifteen lines of markup plus an apply handler, and
it sits inside a page-specific form with page-specific state. Extracting it
would mean a component taking the email, the cart, the disabled state and the
apply callback, to save duplicating markup twice. What must not diverge is the
two server calls, and those are shared already because they are the same
endpoints. If a third place ever needs a promo field, extract it then.

**The assistant is told where the field is, and nothing else.** One sentence of
`SYSTEM_PROMPT` changes: "entered on the checkout page" becomes "entered on the
checkout page, or in the promo field on the draft card". Every prohibition in
the surrounding lines stays exactly as written.

## Risks / Trade-offs

- **A visitor types the code at the assistant instead of into the field, and the
  model repeats it back.** → The code is then in the history, though only one the
  visitor already held, and nothing acts on it. The system prompt tells the
  assistant to point at the field rather than engage; a live test covers that it
  does not re-price or claim to have applied anything.
- **Someone uses the drawer's promo field as an oracle to enumerate codes.** →
  The same exposure the checkout page has had since promo codes shipped, and the
  same defences: the chat and order routes are rate limited, a code has to be
  active to do anything, and a redemption is capped per email address. This
  change adds no new distinguishing response.
- **The two promo fields drift in behaviour.** → They call the same two
  endpoints, and the refused-code clearing rule is stated once in this document
  and tested in both places. Markup drift is cosmetic.
- **The number on the draft card disagrees with what the buyer is charged.** →
  Already true of every total in this app and handled the same way:
  `create_order` prices at submit and the confirmation email states what was
  actually recorded.

## Migration Plan

No migration. No schema change, no new environment variable, no route change. A
draft with no code entered behaves exactly as it does today, so a deploy changes
nothing for anyone who does not type in the new field. Rolling back is reverting
the commit.

## Open Questions

- Whether the drawer should carry the newsletter opt-in checkbox that both other
  forms have. It is the same shape of addition and would reuse
  `subscribeQuietly`, but it is separate scope and changes no requirement here.
