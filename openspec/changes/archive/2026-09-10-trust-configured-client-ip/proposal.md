## Why

All four rate-limited routes identify the caller with
`getRequestIP(event, { xForwardedFor: true })`. That reads the
`X-Forwarded-For` header the request arrived with. A header the client controls
is not an identity: a new value per request resets every limit, and the limits
are what stands in for a captcha in phase 1.

Vercel is the exception that has been hiding this. It overwrites
`X-Forwarded-For` and does not forward external values, explicitly to prevent
spoofing, so the deployment running today is not exposed. That is a property of
one host, not of this code. This repository is a template, and an adopter who
puts it behind their own nginx, a Cloudflare tunnel, or a bare Node process
inherits a limiter that anyone can step around.

There is a second, quieter problem in the same expression. When no address
resolves, every caller becomes the string `unknown`, so they share one bucket:
a handful of unidentifiable visitors can lock each other out of ordering.

## What Changes

- Add one helper that resolves the client address for every rate-limited route,
  replacing four copies of the same expression.
- Read the address from a configured trusted header, defaulting to
  `x-vercel-forwarded-for`, which Vercel sets and a proxy in front of Vercel
  cannot overwrite.
- Fall back to the connection's own socket address when that header is absent,
  which is what makes local development and a bare Node deployment work.
- Never read `X-Forwarded-For` unless the deployment names it as its trusted
  header. An adopter behind their own proxy opts in deliberately.
- Take the last value of a multi-value header rather than the first. The last
  hop is the one the trusted proxy appended; the first is whatever the client
  sent.
- **BREAKING for an unconfigured non-Vercel proxy deployment**: a shop already
  running behind a proxy that sets only `X-Forwarded-For` will start limiting on
  the proxy's own address, which is one shared bucket, until it sets the new
  variable. The README and `.env.example` say so.
- Keep a limit in force when no address resolves at all, and log that it
  happened, so a misconfigured proxy is visible rather than silent.

## Non-goals

- No captcha, and no change to any of the four limits or windows. This changes
  who a limit applies to, not how generous it is.
- No shared limiter store. The window stays in memory and still resets on
  restart, and still does not span instances. That is recorded and unchanged.
- No IP logging, storage or geolocation. The address is used to build a bucket
  key and is not written anywhere.
- No change to the assistant's separate daily budget or to the test-order
  exemption.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `ordering/failure-reporting`: gains where a rate-limited route may learn who
  is calling, and what it must do when it cannot, which is currently
  unspecified and is where the shared `unknown` bucket comes from.

## Impact

- `server/utils/rate-limit.ts` gains the resolver, or a sibling module beside
  it. The limiter itself is untouched.
- Four call sites change: `server/api/orders.post.ts`,
  `server/api/contact.post.ts`, `server/api/email-optin.post.ts`,
  `server/api/chat.post.ts`.
- `nuxt.config.ts` gains a `runtimeConfig` key, with `.env.example` and the
  README documenting it. It is server-only and is not a secret.
- `tests/unit/rate-limit.test.ts` asserts the current call-site text at
  `:128` and `:133` and will need updating with it.
- No Supabase schema or RLS change. No change to any response a customer sees,
  except that a caller the server cannot identify now produces a server log
  line, rather than silently sharing a bucket.
