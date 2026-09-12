## 1. Carry a term into the panel

- [x] 1.1 Give the search-palette store a seed term and let `openPalette()` take one; verify the store still persists nothing, since a panel that reopened itself would be a panel nobody asked for
- [x] 1.2 Have `SearchPalette.vue` start from that seed when it opens, and clear it on close; verify opening with a seed lists that term's matches rather than the whole catalogue

## 2. Make the field a launcher

- [x] 2.1 Open the panel when the catalogue page's field is clicked or focused, passing the term the page is filtered by; verify the catalogue underneath does not change until something is chosen
- [x] 2.2 Keep the field showing the active term and keep its clear control working; verify clearing restores the catalogue and opens no panel
- [x] 2.3 Check the field cannot be typed into behind the open panel; verify a keystroke reaches the panel's field rather than splitting the term across two boxes

## 3. Verification

- [x] 3.1 Update the e2e tests that type into the catalogue field, which now drive the panel instead; verify `npm run test:e2e` passes
      *Six tests drove the old field. One of them, "one Back leaves the page", changed meaning rather than mechanics: "see all" pushes, so one Back now returns to the unsearched catalogue and a second leaves it. The spec delta says so.*
- [x] 3.2 Run `npm run check` and `npm run build`; verify both pass
- [x] 3.3 Drive it in a browser at 1280px and 390px in both schemes; verify the panel opens, carries the term, closes on Escape and leaves the cart alone
- [ ] 3.4 Update `handoff.md` and the root `tasks.md`
