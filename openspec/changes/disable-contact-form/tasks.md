# Tasks

No Supabase migration and no new environment variable. Nothing in this change touches the database or the deployment's configuration.

## 1. Remove the server route

- [x] 1.1 Delete `server/api/contact.post.ts` and verify `POST /api/contact` returns 404 against the dev server
- [x] 1.2 Delete `contactSchema` from `server/utils/schemas.ts`, and drop its block from `tests/unit/schemas.test.ts`, verifying the remaining schema tests pass
- [x] 1.3 Delete `ContactEmailPayload` and `sendContactEmail` from `server/utils/email.ts`, leaving the escaping and shop-name helpers in place, and verify `tests/unit/email-shop-name.test.ts` and `tests/unit/customer-email.test.ts` still pass
- [x] 1.4 Drop `contact.post.ts` from both route lists in `tests/unit/rate-limit.test.ts` and verify the file's assertions still hold for the remaining routes
- [x] 1.5 Confirm `subscribeQuietly` keeps its checkout caller and verify the opt-in unit tests pass unchanged

## 2. Remove the page and the chrome link

- [x] 2.1 Delete `app/pages/contact.vue` and verify `/contact` renders the 404 page
- [x] 2.2 Remove the `/contact` NuxtLink from `app/layouts/default.vue` and verify no envelope control remains in the header on any page using the default layout
- [x] 2.3 Drop `/contact` from the route list in `tests/e2e/global-setup.ts` and from the page list in `tests/e2e/console-clean.spec.ts`, then verify `console-clean.spec.ts` passes

## 3. Remove the custom-order request path

- [x] 3.1 Remove `askAboutThis`, the custom-order offer in the empty-search state, and the `useCustomOrderStore` import from `app/pages/index.vue`, verifying an empty search still shows the "nothing matched" message and the clear-search control
- [x] 3.2 Delete `app/stores/custom-order.ts` and verify no import of `useCustomOrderStore` remains anywhere in `app/`
- [x] 3.3 Delete `tests/e2e/custom-order-request.spec.ts` and `tests/unit/custom-order-request.test.ts`, and verify the suites run clean without them
- [x] 3.4 Add an e2e assertion that a search matching nothing offers no way to ask staff, and verify it passes

## 4. Stop the assistant pointing at a page that is gone

- [ ] 4.1 Rewrite the out-of-stock line in the `server/utils/assistant.ts` system prompt so it states the shop does not stock the item and explicitly says there is no request form to point at, keeping the existing prohibition on quoting a price or committing the shop
- [ ] 4.2 Add an e2e check that asking the assistant for something the catalogue does not carry produces a reply naming no contact page or request form, and verify it passes

## 5. Specs and documentation

- [ ] 5.1 Update the contact section of `handoff.md` to record that the demo has no contact channel and why, and verify no sentence there still describes a working form
- [ ] 5.2 Run `openspec validate disable-contact-form --strict` and verify it reports no errors

## 6. Integration check

- [ ] 6.1 Run the full unit and e2e suites and verify both pass with no reference to a contact route
- [ ] 6.2 Grep the built client bundle for the staff address and verify it appears nowhere, satisfying the privacy requirement moved to `storefront/shop-identity`
