## Why

Every deployment writes to the same `orders` table, and will until the two shops' databases are split. An order placed while clicking around a dev server or a preview is therefore real business: it emails staff, it sits in the dashboard among orders somebody has to fulfil, and it has to be found and deleted by hand. That happened on 2026-09-11, when a delivery test against production produced a genuine order and a genuine staff email.

The `is_test` marker already exists and already does the right thing, but only an automated suite can set it, by presenting a secret header. A person clicking through a dev server cannot, and is exactly the person who forgets.

The banner added the same day says a deployment is not the live shop. This makes the orders it produces agree with the banner.

## What Changes

- An order placed on a deployment that names itself as something other than the live shop SHALL be recorded as a test, without any header.
- The secret header keeps working exactly as it does, so an automated suite against a production-like build is unchanged.
- **The rate-limit exemption does not widen.** It stays tied to the secret alone: a dev server is still limited like a customer, so the limiter is exercised where it is easy to notice it misbehaving.
- Production is unaffected. It names no environment, so it takes the path it takes today.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `ordering/test-order`: one requirement changes. "Only a caller holding the server's test secret may declare a test order" currently states that the check runs the same way in every environment. A second way in is added, and the reasoning behind that original sentence has to be answered rather than dropped.

## Impact

- `server/api/orders.post.ts`: how `isTest` is decided, and only that. What it then does with it is untouched.
- Unit tests over the orders route, which already cover the header cases.
- `handoff.md`, which records the original decision and now records why it changed.
- No schema change, no new environment variable: this reads `NUXT_PUBLIC_DEPLOY_ENV`, added the same day.
