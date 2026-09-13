## Why

Two shops now send mail, from the same address, to the same staff inbox. Nothing
in an email says which shop it came from: a staff notification reads
`New order from Ada Lovelace ($23.20)` whichever shop took the order.

That is fine with one shop and wrong with two. Staff cannot sort the inbox,
cannot tell whose stock to pick, and cannot answer "did the real shop sell
anything today" without opening rows in a dashboard. It gets worse with a third
shop, and the template is meant to run any number.

The buyer's own confirmation has the same gap from the other side: it thanks
them for an order without naming the shop they bought from.

## What Changes

- **Every outgoing email names its shop.** The staff order notification, the
  buyer's confirmation, the contact and custom-order messages, and the
  newsletter welcome.
- **The name comes from the shop's own configuration**, the same value the
  storefront header shows, so a deployment cannot send mail under a name it does
  not display.
- **A shop with no name configured still sends.** Mail that fails because a
  variable is unset is worse than mail that reads a little plainly.

## Capabilities

### Modified Capabilities

- `storefront/shop-identity`: it says a deployment presents one identity to
  customers and touches only its own data. Email is part of that identity and
  the requirement does not yet cover it.

## Impact

- **`server/utils/email.ts`**, the four send functions and their subjects.
- **The unit tests** that assert on subjects.
- **No new environment variable**: `NUXT_PUBLIC_STORE_NAME` already exists, is
  already per-shop, and is already set on every deployment.
- **No change to whether mail is sent, to whom, or with what reply-to.**

## Non-goals

- **No per-shop sender address.** Both shops send as `orders@bobdempsey83.com`,
  and splitting that means verifying another domain in Resend for no benefit
  staff can see. The subject is what an inbox sorts on.
- **No per-shop admin inbox.** One person reads both today. If that changes it
  is a variable, not this change.
- **No redesign of the email templates.** This names the shop; it does not
  restyle anything.
