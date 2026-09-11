## Context

See proposal.md for motivation. What constrains the approach:

- Four routes build a bucket key from
  `getRequestIP(event, { xForwardedFor: true }) ?? 'unknown'`:
  `orders.post.ts:41`, `contact.post.ts:9`, `email-optin.post.ts:8`,
  `chat.post.ts:16`. Three prefix the key (`contact:`, `email-optin:`,
  `chat:`); orders uses the bare address.
- h3 1.15.11 supplies `getRequestIP`. With `xForwardedFor: true` it reads the
  `X-Forwarded-For` header and takes its **first** value; without the flag it
  returns the socket address. There is no option for "a different header".
- Vercel's documentation states it overwrites `X-Forwarded-For` and does not
  forward external IPs, "to prevent IP spoofing", and that
  `x-vercel-forwarded-for` is the same value but cannot be overwritten by a
  proxy placed on top of Vercel.
- `tests/unit/rate-limit.test.ts:128` and `:133` assert the literal text of two
  call sites, so they change with the call sites.
- `nuxt.config.ts` has no `nitro` key today.

## Goals / Non-Goals

**Goals:**

- One place decides what counts as the caller's address, so a future host is
  one config value rather than four edits.
- Safe by default on Vercel and safe by default off it, without the adopter
  having to understand the problem first.
- A misconfiguration is visible in the log rather than silently unlimited.

**Non-Goals:**

- Supporting a chain of several trusted proxies. One hop is what this app has,
  and counting hops correctly is a different design.
- Validating that the resolved value is a well-formed IP address. It is a
  bucket key, not an address the app acts on.

## Decisions

**A `NUXT_TRUSTED_IP_HEADER` runtime config value, defaulting to
`x-vercel-forwarded-for`.** A default that is wrong for the host is worse than
no default, and this repository deploys to Vercel today, so Vercel's own header
is the honest default. An adopter behind nginx sets `x-forwarded-for`; an
adopter behind Cloudflare sets `cf-connecting-ip`; an adopter running Node
directly sets it empty and gets the socket address.

`X-Forwarded-For` is reachable, but only by naming it. That is the whole point:
trusting it becomes a decision someone made rather than a default nobody saw.

**The helper reads the header itself rather than calling `getRequestIP` with
the flag.** h3's flag is hard-wired to `X-Forwarded-For` and takes the first
value, which is the client-controlled end of the list. Reading the configured
header directly is both more general and more correct, and `getRequestIP(event)`
without the flag still supplies the socket fallback.

**The last value wins, not the first.** A proxy appends; so the last value is
the one the trusted hop wrote and everything before it arrived with the
request. Taking the first is what makes a spoofed `X-Forwarded-For` work.

**The fallback chain is the trusted header, then the connection address, then
one pooled bucket.**

The first draft of this design refused an unidentifiable caller outright, on
the reasoning that a socket address is present on every ordinary request and
the branch was therefore near-unreachable. Implementing it proved that wrong:
under `npm run dev` the request's socket object exists but its `remoteAddress`
is null, so nothing resolved and every order, contact and opt-in request was
refused with a 429. Production on Vercel was unaffected, because
`x-vercel-forwarded-for` resolves there, which is exactly the kind of
difference that makes a local suite pass while a deployment behaves otherwise.

So the chain ends in a pooled bucket rather than a refusal. Pooling is the
weakest outcome of the three and it is still the right one: refusing takes the
shop offline wherever a platform exposes no address, and serving unlimited is a
documented way around every limit. Pooling keeps a limit in force. The loud log
line is what keeps it from going unnoticed.

`getRequestIP(event)` is tried first, then `event.node.req.socket.remoteAddress`
directly. h3 reads the same field, so the second rarely adds anything, but it
costs nothing and the failure it guards against was invisible until it happened.

**The helper lives beside the limiter, not inside it.** `rateLimit` takes a key
and knows nothing about HTTP; keeping it that way means the unit tests that
cover the window stay free of event plumbing.

## Risks / Trade-offs

- **An adopter behind their own proxy who never reads the README** gets every
  request keyed on the proxy's address, which is one shared bucket, and will
  see legitimate customers refused under load. → The default is documented in
  `.env.example` and the README's setup section, and this is the safe direction
  to fail: over-limiting is visible and complained about, under-limiting is
  silent.
- **`x-vercel-forwarded-for` is a vendor header in a template that is not
  vendor-specific.** → It is a default, not a requirement, and the mechanism is
  a plain header name. Changing hosts is one variable.
- **A pooled bucket lets unidentifiable callers spend each other's allowance.**
  → Accepted, as the least bad of three outcomes; the log line names the cause,
  and naming the platform's header fixes it without deploying new code.
- **The two source-reading assertions in the unit tests get stale**, and a test
  that reads source text is brittle by nature. → They move to the helper, which
  is one place rather than four, and the behaviour they stand in for gets real
  tests of its own.
