No task below needs a Supabase migration or a new environment variable, and
none touches `supabase/schema.sql` or an RLS policy.

## 1. Stop leaking database detail from the cart preview

- [x] 1.1 In `server/api/cart/preview.post.ts`, replace the 502's `error.message` with a customer-facing sentence and `console.error` the underlying error, following the `[orders]` log prefix convention; verify by pointing the query at a non-existent table temporarily and confirming the response body carries no Postgres text while the dev-server log does
- [x] 1.2 Confirm the 400 for an invalid cart body is unchanged; verify with a POST whose items array is empty

## 2. Stop asserting an unread total

- [x] 2.1 In `server/api/orders.post.ts`, return `{ orderId }` alone when the re-read failed and `{ orderId, totalCents }` when it succeeded; verify with a successful order that the total is present and correct
- [x] 2.2 Verify the failed-re-read path returns the order id with no `totalCents` and still 200s, by temporarily pointing the re-read at a bad table; confirm the staff email's `incomplete` banner path is untouched
- [x] 2.3 Type the response so `totalCents` is optional wherever it is declared (`app/types/index.ts` if it lives there), and confirm `app/pages/checkout.vue` still compiles and navigates on success; verify with `npx vue-tsc --noEmit -p .nuxt/tsconfig.server.json` and an end-to-end order

## 3. Confirmation wording

- [x] 3.1 In `app/pages/order-received.vue`, state that the amount will be confirmed by email, keeping the reference as the only order-specific value shown and introducing no total; verify the page renders correctly in both colour schemes

## 4. Correct the documentation

- [x] 4.1 Fix the docstring in `server/utils/rate-limit.ts` to say sliding window and describe the boundary behaviour accurately; verify by reading it against the implementation
- [x] 4.2 Update `handoff.md`: correct the limiter's description in section 4, and resolve the section 9 entries for the preview leak, the `$0.00` total (noting it was a latent contract bug, never rendered) and the fixed-window wording; verify no open item in section 9 still describes fixed behaviour
