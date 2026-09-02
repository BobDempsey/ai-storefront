## Context

See proposal.md for motivation. What shapes the approach here:

- The cart is a Pinia store persisted to a cookie. The browser owns it. The
  server reads it on every request but never writes it.
- `POST /api/orders` already rate-limits, validates with Zod, calls
  `create_order` and emails staff. `create_order` is the only thing that prices
  an order.
- There are no accounts and no sessions, so the server cannot tell one visitor
  from another beyond an IP that a header can forge.
- `server/utils/rate-limit.ts` is an in-memory sliding window. It holds nothing
  across a restart.
- Six physical products and three files. The whole catalogue fits in a prompt.

## Goals / Non-Goals

**Goals:**

- The model's permissions are the tool list, readable in one file.
- A visitor can go from a question to a submitted order without leaving the
  drawer, and cannot end up with an order they did not agree to.
- Every figure a visitor sees is rendered by the storefront from server data,
  not typed by a model.

**Non-Goals:**

- Defending against a determined attacker's token spend. The limits here raise
  the cost of abuse; they do not close it. See the risk below.
- Conversation quality work: evaluation sets, prompt iteration, fallbacks
  between models.

## Decisions

### The model has no tool that writes anything

The tool list is the whole permission model, so the dangerous capabilities are
simply absent rather than guarded:

| Tool | What it does | Runs where |
| --- | --- | --- |
| `search_catalogue` | name, description, price, kind, availability | server |
| `get_product` | one item by slug | server |
| `get_cart` | the server-priced cart, from `/api/cart/preview` | server |
| `propose_cart_change` | returns an intent, changes nothing | server, then client |
| `draft_order` | returns a draft for the visitor to confirm; its confirmation is minted beside the tool result, never inside it | server, then client |

There is no `submit_order`. The confirm button in the drawer calls
`/api/orders` from the client, the same call `app/pages/checkout.vue` makes,
carrying the confirmation described below. The model cannot submit an order
because nothing it can emit reaches that endpoint, and cannot borrow a confirmed
one because it never holds the confirmation.

The alternative was a `submit_order` tool guarded by a confirmation flag on the
request. That works until a prompt talks the model into setting the flag.
Absence does not have that failure mode.

### A draft carries a one-time confirmation the model never sees

When `draft_order` runs, the server mints a random confirmation, stores it
against that draft with a short expiry, and returns it in the route's response
next to the tool output rather than inside it. The drawer holds it, the Confirm
button sends it back, and the server spends it on the way through to the order.
Presented twice, the second attempt is refused.

The confirmation is deliberately outside the model's view. Tool results go into
the message history and back to the provider on the next turn; the confirmation
never enters that channel, so no prompt can talk the model into repeating it and
no forged history can carry one.

What this does not do is lock down `/api/orders`. That endpoint is public and
always has been: the checkout page posts to it directly, and so can anything
else. Requiring a confirmation there too would add a round trip to checkout and
guard nothing a determined client could not already do. What the confirmation
buys is forward-looking. The day the assistant gets a tool that submits on the
visitor's behalf, that tool still cannot produce a submission, because the one
thing submission requires is the one thing the model was never given.

Storage is an in-memory map with a short TTL, alongside the rate limiter, and it
inherits the limiter's weakness: a restart forgets every outstanding draft, so a
visitor who confirms across a deploy is told to draft again. That is acceptable
for a confirmation measured in minutes.

Alternatives considered: signing the draft so nothing is stored (stateless, but
a signature cannot be spent once, so replay needs storage anyway); a flag on the
submit call saying the visitor confirmed (a value the model can emit, which is
exactly the failure mode this avoids).

### The conversation is stateless on the server

The client holds the messages and sends them with each turn. The server holds no
conversation, which is what "no stored conversations" means in practice and what
lets a reload start fresh with no cleanup. The one exception is the confirmation
below: a short-lived entry per draft, holding no message text, which expires on
its own.

The cost: a client can forge the history it sends. That is acceptable only
because nothing authoritative is read from it. Prices come from the catalogue at
tool-call time, the cart comes from `/api/cart/preview`, and the order comes
from `/api/orders` with the cart cookie the browser actually holds. A forged
history buys an attacker a different conversation, not a different price.

### A cart change round-trips through the client

```
  visitor: "add the dice tower"
      │
      ▼
  /api/chat ──▶ model ──▶ propose_cart_change{ add, <product id>, 1 }
      │                              │
      │◀─────────────────────────────┘
      ▼
  response: { reply, intents: [...] }
      │
      ▼
  drawer applies each intent through the cart store
      │
      ▼
  same store, same rules, same header count as clicking Add to cart
```

Routing the change through `useCartStore()` rather than a parallel path is what
makes the file cap, the 99 ceiling and the persistence apply for free. The
server resolves the product id and rejects an unknown one before the intent is
ever returned, so the client applies ids that exist.

### Figures are rendered, never typed

The drawer renders cart lines, totals and the order draft as components fed from
`/api/cart/preview`, the way the cart and checkout pages already do. The model's
text sits above them. It may repeat a price a tool gave it, which is the
catalogue price; it never computes one.

### Off-topic handling is a system prompt, not a classifier

A second model call to classify every message would roughly double the cost to
enforce a soft rule. The system prompt states the scope and the decline, and the
tool list means an off-topic conversation can waste tokens but cannot do
anything. Accepting occasional leakage here is deliberate.

### The caps are counted server-side, in terms the server can actually see

The server counts messages in the submitted history and refuses past 25. With no
session identity, "3 conversations a day" is enforced as a budget of 75 chat
requests per IP per day on the existing limiter, keyed `chat:<ip>`. That is the
honest description of what the mechanism does; the drawer presents it to the
visitor as conversations.

Per turn, the tool loop is capped at 4 iterations so one message cannot fan out
into an unbounded run of tool calls.

## Risks / Trade-offs

- **The IP limit is bypassable, exactly as the order and contact limits are.**
  `getRequestIP(event, { xForwardedFor: true })` trusts a client header, and a
  new value per request resets the budget. → Unchanged from the existing routes
  and recorded in handoff.md section 9, but the stake is now a metered API bill
  rather than junk mail. Fixing it properly needs a deploy target whose
  forwarded header can be trusted. Consider a global daily ceiling as a
  backstop, so the worst case is a disabled assistant rather than a bill.
- **The in-memory limiter forgets on restart**, so a daily budget resets on every
  deploy. → Accepted at MVP traffic; the same limitation already applies to the
  order limit, on a ten-minute window where it matters less.
- **Product descriptions are model input.** → Staff write them, so this is not an
  untrusted channel today. It becomes one the moment anything user-submitted
  reaches the prompt, and the tool list is what keeps the blast radius at
  "says something odd".
- **The model may still be confidently wrong in prose.** → Nothing it says
  changes what is ordered: the draft card shows the real lines and the real
  total, and the visitor confirms that, not the sentence above it.
- **No transcript.** When a visitor says the bot ordered the wrong thing, there
  is nothing to read. → Accepted for now; see the open question.
- **An outstanding confirmation is lost on restart**, so a visitor confirming
  across a deploy is asked to draft again. → The window is minutes, and the
  failure is a repeated click rather than a lost or duplicated order.
- **A new dependency and a paid API in the critical path of a page control.** →
  The drawer degrades to "unavailable" when the key is missing or the provider
  fails, and no other page depends on it.

## Migration Plan

No schema change and no migration. `NUXT_OPENAI_API_KEY` goes into `.env` and
`.env.example`, and `runtimeConfig` picks it up by prefix. Rolling back is
removing the key, which turns the drawer off and leaves the rest of the shop
untouched.

## Open Questions

- Whether to log conversations server-side for debugging, and for how long. It
  trades the privacy position in the proposal against being able to explain a
  bad order. Nothing in the specs or the task breakdown depends on the answer,
  and it can be added later without changing the shape of the route.
