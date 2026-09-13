## Where the name comes from

`useRuntimeConfig().public.storeName`, the same value the storefront header
renders. Reading it from anywhere else, or passing it in from each caller, would
allow a deployment to send mail under a name it does not display, which is the
one thing this change exists to prevent.

`server/utils/email.ts` already destructures `useRuntimeConfig()` in all four
send functions, so this is the same read they already do.

## What the subjects become

The shop name goes first, because an inbox truncates the end of a subject and
sorts on the start.

| Mail | Today | After |
| --- | --- | --- |
| staff order | `New order from Ada Lovelace ($23.20)` | `[Forged in Filament] New order from Ada Lovelace ($23.20)` |
| buyer confirmation | `Your order <id> ($23.20)` | `Your Forged in Filament order <id> ($23.20)` |
| contact | `Contact form: Ada Lovelace` | `[Forged in Filament] Contact form: Ada Lovelace` |
| custom order | `Custom order request: Ada Lovelace` | `[Forged in Filament] Custom order request: Ada Lovelace` |
| newsletter welcome | `You're subscribed` | `You're subscribed to Forged in Filament` |

**Staff mail gets a bracketed prefix and customer mail does not.** The bracket is
a filing aid for someone reading many shops' mail in one inbox, and it reads as
machinery to a buyer, who knows perfectly well which shop they just bought from
and wants a sentence rather than a tag.

## The unconfigured case

`storeName` defaults to `Store`, so there is no empty-string case in practice.
The requirement still says mail must send without it, because the alternative is
an order that is committed, charged nothing, and silently never reported.

So: fall back to a name-free subject rather than to an empty bracket. `[] New
order from ...` is worse than `New order from ...`, and a template adopter who
has not set the variable yet should not get mail that looks broken.

## Why not the sender address

`orders@forged-in-filament.example` would sort an inbox too, and it needs
another verified domain in Resend per shop. The subject costs nothing and works
the moment a shop sets a name it already has to set.

## Escaping

Nothing new. `storeName` is operator configuration rather than visitor input,
and it goes into the subject rather than the HTML body. The body's existing
`esc()` discipline is unchanged and still applies to everything from a form.
