No migration and no new environment variable. This change adds no Supabase
schema or RLS change; everything it states is already recorded on the order.

## 1. The confirmation email

- [x] 1.1 Add a `CustomerEmailPayload` type to `server/utils/email.ts` carrying the order id, the customer, the priced items and total, and the optional discount, and verify `npx tsc --noEmit` is clean
- [x] 1.2 Write `renderCustomerHtml` alongside `renderHtml`, reusing `esc`, `escMultiline` and `money`: order id, line items with quantity and amount, and the total, and verify a unit test asserts each figure appears
- [x] 1.3 Add the subtotal and discount rows, shown only when the payload carries a discount, naming the promo code and its percentage or the store sale and its percentage, and verify unit tests cover a code-priced, a sale-priced and an undiscounted order
- [x] 1.4 Add the standing copy: that this is an order request, that no payment has been taken, and that staff will make contact to arrange it, and verify a unit test asserts the no-payment sentence is present in every rendering
- [x] 1.5 Add the file sentence, rendered only when a line carries a `file_name_snapshot`, saying the file is emailed once payment is arranged, and verify unit tests cover a file order and a physical-only order, the latter mentioning files nowhere
- [x] 1.6 Verify by unit test that a name, a promo code and a product name containing `<`, `>`, `&` and quotes all render escaped, matching how `renderHtml` is already tested
- [x] 1.7 Write `sendCustomerEmail`, sending to the customer address with `replyTo` set to `orderAdminEmail`, subject naming the order and its total, returning without sending when `resendApiKey` or `orderAdminEmail` is unset, and verify a unit test covers the unconfigured case sending nothing

## 2. Sending it from the order route

- [x] 2.1 In `server/api/orders.post.ts`, send the confirmation after the staff notification, in its own `try`/`catch` logging under `[orders]`, from the data already re-read, and verify `npm test` and `npx tsc --noEmit` are clean
- [x] 2.2 Guard it with the existing `!isTest` check and with `!incomplete`, so a test order and a failed re-read both send nothing, and verify unit tests cover both suppressions
- [x] 2.3 Verify by unit test that a throw from the staff notification still leaves the confirmation sent, and a throw from the confirmation still leaves the route returning the order id

## 3. Tests against the live path

- [x] 3.1 Extend `tests/db/orders-api.test.ts` to assert a test-token order still reports placed with no email failure, and verify `npm run test:db` passes with a dev server running
- [x] 3.2 Run the whole suite — `npm test`, `npm run test:db`, `npm run test:e2e` — and verify nothing that passed before this change now fails

## 4. Verify end to end and record it

- [x] 4.1 Place a real order through the checkout form against a running `npm run dev`, using the Resend account address as the customer email, and verify the buyer confirmation and the staff notification both arrive, carrying the same total
- [x] 4.2 Place a second order with an active promo code and verify the confirmation's subtotal, discount and total match the staff notification's three figures for the same order
- [x] 4.3 Delete the test orders, their items and any redemption row they created, and verify `orders` holds none of them
- [x] 4.4 Run `npm run build` and verify it passes
- [x] 4.5 Update `handoff.md`: the confirmation email in section 10, and the note that a real buyer receives nothing until a domain is verified, so the next agent does not read that silence as a bug
