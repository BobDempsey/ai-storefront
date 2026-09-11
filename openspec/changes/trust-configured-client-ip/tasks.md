## 1. Configuration

- [x] 1.1 Add `trustedIpHeader` to `runtimeConfig` in `nuxt.config.ts`, defaulting to `x-vercel-forwarded-for`, and verify `useRuntimeConfig()` returns it in a running dev server
- [x] 1.2 Document `NUXT_TRUSTED_IP_HEADER` in `.env.example` with the nginx, Cloudflare and bare-Node values, and verify the file still parses as env

## 2. The resolver

- [x] 2.1 Add a `clientAddress(event)` helper beside `server/utils/rate-limit.ts` that reads the configured header, falls back to the socket address, and returns null when neither resolves; verify it is exported and auto-imported
- [x] 2.2 Verify it takes the last value of a multi-value header, not the first, so a client-prepended value cannot win
- [x] 2.3 Verify it ignores `x-forwarded-for` entirely when the configured header is something else, including when `x-forwarded-for` is the only header present
- [x] 2.4 Verify an empty configured header name means socket-address-only, with no header read at all
- [x] 2.5 Verify it trims whitespace and treats an empty or whitespace-only header value as absent, falling through to the socket

## 3. Refusing an unidentifiable caller

- [x] 3.1 Add a `rateLimitByCaller(event, bucket, limit, windowMs, message)` wrapper that resolves the address and pools unidentifiable callers into one bucket rather than refusing them; verify they are still limited
- [x] 3.2 Verify the refusal message is the caller-facing one and names no header, proxy or setting, and that the reason is written to the server log instead
- [x] 3.3 Verify the log fires only when the caller cannot be identified, not on an ordinary request

## 4. The four call sites

- [x] 4.1 Switch `server/api/orders.post.ts` to the wrapper, preserving the bare-address key, the 5-per-10-minutes limit and the test-order exemption; verify by placing an order that the limit still applies to a normal caller and not to a token-bearing one
- [x] 4.2 Switch `server/api/contact.post.ts`, preserving the `contact:` prefix and 3 per 10 minutes; verify the bucket is still separate from orders
- [x] 4.3 Switch `server/api/email-optin.post.ts`, preserving the `email-optin:` prefix and 5 per 10 minutes; verify the same
- [x] 4.4 Switch `server/api/chat.post.ts`, preserving the `chat:` prefix and 75 per day; verify the same
- [x] 4.5 Verify no `getRequestIP(event, { xForwardedFor: true })` call remains anywhere under `server/`

## 5. Tests

- [x] 5.1 Add unit tests for the resolver covering every branch in group 2, and verify they pass with no network
- [x] 5.2 Update the two source-reading assertions in `tests/unit/rate-limit.test.ts` to check the helper is used and that the raw h3 forwarded-for call is gone; verify they fail if a call site is reverted
- [x] 5.3 Add a test proving a spoofed `x-forwarded-for` no longer resets an allowance, and verify it fails against the old behaviour
- [x] 5.4 Run `npm test`, `npm run test:db`, `npm run test:e2e` and `npm run test:smoke`, and verify all still pass

## 6. Documentation

- [x] 6.1 Add the variable to the README setup section with the per-host values, and verify the link from `AGENTS.md` still resolves
- [x] 6.2 Update `handoff.md`: mark the "rate limiting is bypassable" problem fixed, record that Vercel was masking it, that the dev server exposes no client address, and that probing the limiter with real orders emails staff
