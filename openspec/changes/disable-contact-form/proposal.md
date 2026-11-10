# Proposal

## Why

The contact route on the demo storefront is being used to send spam to the shop's staff address. The form is unauthenticated, stores nothing, and delivers straight to email, so every submission that clears Zod validation and the rate limit becomes an inbox message. The demo does not need a contact channel, so the cheapest fix is to stop serving the route rather than to harden it.

## What Changes

- **BREAKING** Remove the `/contact` page and the `POST /api/contact` route. Both the ordinary contact message and the custom-order request ride that route, so both go.
- Remove the contact link from the site chrome in the default layout.
- Remove the custom-order offer from the empty-search state, along with the store that carries the search term to the form.
- Change the assistant so it tells a visitor the shop does not stock an item without pointing at a request form that no longer exists.
- Remove the contact form's newsletter opt-in. Checkout keeps its own opt-in, and `POST /api/email-optin` is untouched.
- Remove the contact and custom-order email templates and the `contact:` rate-limit bucket.
- Remove the tests that cover the removed behaviour.

This lands on `main` only. `fif` is a separate shop with its own deploy and is not cherry-picked.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `contact/contact-message`: every requirement is removed. The storefront no longer offers a way to send a message.
- `contact/custom-order-request`: every requirement is removed, except that the assistant still declines to invent stock. What it points at changes.
- `newsletter/email-optin`: the contact form is no longer one of the places a visitor can opt in, and the contact-message scenarios for secondary subscription go with it.
- `storefront/shop-identity`: the scenario that names contact messages and custom-order requests among the mail a shop stamps its name on narrows to the newsletter welcome.

## Impact

Code: `app/pages/contact.vue`, `app/layouts/default.vue`, `app/pages/index.vue`, `app/stores/custom-order.ts`, `server/api/contact.post.ts`, `server/utils/email.ts`, `server/utils/schemas.ts`, `server/utils/assistant.ts`.

Tests: `tests/e2e/custom-order-request.spec.ts`, `tests/unit/custom-order-request.test.ts`, `tests/unit/schemas.test.ts`, `tests/unit/rate-limit.test.ts`, `tests/e2e/console-clean.spec.ts`, `tests/e2e/global-setup.ts`.

No Supabase schema or RLS policy changes. Nothing in the contact path touches the database.

Anyone who linked to `/contact` gets a 404. Visitors lose their only way to reach staff from the storefront, because the shop address is deliberately kept out of every page. On a demo that is acceptable; on a real shop it would not be.

## Non-goals

- Keeping the form behind a captcha, a honeypot, or a stricter rate limit. The demo does not need the channel at all.
- Changing anything on `fif`, which has its own contact form and its own spam exposure.
- Touching the checkout path, the order notification emails, or the newsletter opt-in route.
- Adding a replacement contact channel such as a published email address. The spec that forbids rendering the staff address into a page stays in force.
