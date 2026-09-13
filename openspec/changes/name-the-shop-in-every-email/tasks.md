## 1. Name the shop

- [x] 1.1 Read `storeName` from `useRuntimeConfig().public` in `server/utils/email.ts`, beside the reads already there; verify no caller has to pass it in, since a caller could pass a name the storefront does not display
- [x] 1.2 Prefix the staff order notification and the contact and custom-order subjects with the shop name in brackets; verify all three carry it and that the rest of each subject is unchanged
- [x] 1.3 Name the shop in the buyer's confirmation and the newsletter welcome as a phrase rather than a bracketed tag; verify neither reads as machinery to a customer
- [x] 1.4 Fall back to today's subject when no name is configured, rather than an empty bracket; verify a blank `storeName` still sends and still reads sensibly
      *`Store` counts as unconfigured, not as a name. That is an older decision this change had to respect rather than overrule: `sendCustomerEmail` carried a comment saying it omitted the name because "Your order from Store" reads as a bug.*

## 2. Verification

- [x] 2.1 Cover all five subjects with unit tests, including the unconfigured fallback; verify `npm run check` passes
- [x] 2.2 Send one real order and one contact message on a dev server; verify both arrive naming the shop, and delete the order afterwards
      *The contact message was sent and Resend reports it delivered as `[AI Storefront] Custom order request: Subject check`. **The order half cannot be done on a dev server**: a dev deployment marks every order a test and a test order sends no email at all, so there was nothing to receive. The order subject goes through the same `forStaff()` helper and is covered by unit tests. It will be seen for real on the next production order.*
- [ ] 2.3 Cherry-pick onto `fif` and confirm it names that shop rather than the template's; verify `npm run check` passes there too **(the branches have separate `.mcp.json`; do not carry that file across)**
- [ ] 2.4 Update `handoff.md` and `tasks.md` on both branches
