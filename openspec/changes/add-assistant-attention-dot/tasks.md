No task below needs a migration, a schema or RLS change, or a new environment
variable.

## 1. The session flag

- [x] 1.1 ~~Add `app/utils/assistant-panel-opened.ts`~~ superseded by group 6, which stores nothing at all. Originally: with a sessionStorage read and write, each wrapped in `try`/`catch`, and a docblock saying which question it answers and why it is not `assistant-greeted`; verify the read returns "already opened" when a throwing storage stub is in place
- [x] 1.2 ~~Unit tests for the session flag~~ superseded by group 6. Originally: tests covering a fresh session, a session where the panel has opened, a throwing storage, and no storage object at all; verify all four pass

## 2. Clearing the flag

- [x] 2.1 Mark the session flag from `openDrawer()` in `app/stores/assistant.ts`, so a visitor activating the control clears the dot; verify a unit test sees the flag written
- [x] 2.2 ~~Mark it from `autoOpenOnce()` too~~ superseded by group 5, which removes that action entirely; `openDrawer()` is now the only path that opens the panel and so the only one that clears the dot
- [x] 2.3 ~~Expose whether the dot should show, reading the flag once on mount~~ superseded by group 6, where the dot is a store default. Originally: read the flag once on mount rather than on every render so a getter does not touch storage repeatedly; verify a unit test covering shown, not shown, and the storage-failure case

## 3. The dot

- [x] 3.1 Give the assistant button a `relative` wrapper and add an `aria-hidden` `span` dot positioned like the cart badge, inside the existing `ClientOnly`; verify the navbar layout is unchanged when the dot is absent
- [x] 3.2 Colour the dot with an explicit light and dark pair per the layout's convention, not a single `surface` token; verify it is visible against the header in both schemes
- [x] 3.3 Add the pulse keyframes and a `@media (prefers-reduced-motion: reduce)` guard that stops the animation and leaves the dot visible; verify the dot still renders with the animation disabled
- [x] 3.4 Confirm the dot announces nothing to assistive technology and the control's accessible name is what it was; verify the button's `aria-label` is unchanged and the dot carries `aria-hidden`

## 4. Verification

- [x] 4.1 Run `npm test` and confirm every suite passes, including the new flag and visibility cases
- [x] 4.2 Run `npm run build` and confirm it passes
- [x] 4.3 Against a running `npm run dev`, confirm the dot shows on a fresh session, disappears when the panel is opened, and stays gone across a navigation in that session
- [x] 4.4 Confirm the dot returns in a new session (the auto-open half of this task is superseded by group 5, which removes it)
- [x] 4.5 Check the dot in both light and dark, and with reduced motion emulated, confirming it stays visible and legible in all three
- [x] 4.6 Run `npm run test:e2e` and confirm the suite still passes with the dot present
- [x] 4.7 Update `handoff.md` and the root `tasks.md` to record the dot, its session lifetime, and how it differs from `assistant-greeted`

## 5. Removing the auto-open

Added after groups 1 to 4 shipped, when the auto-open was dropped in favour of
the dot alone. No migration, no schema or RLS change, no environment variable.

- [x] 5.1 Delete `autoOpenOnce()` from `app/stores/assistant.ts`; verify nothing else references it
- [x] 5.2 Remove the `onMounted` call to it from `app/components/AssistantDrawer.vue`; verify the drawer no longer opens itself on a first load in a clean browser profile
- [x] 5.3 Delete `app/utils/assistant-greeted.ts` and `tests/unit/assistant-greeted.test.ts`; verify a grep for `assistant-greeted` and `hasBeenGreeted` across `app/` and `tests/` returns nothing
- [x] 5.4 Delete `tests/unit/assistant-auto-open.test.ts`, keeping any dot assertions worth saving by moving them into `tests/unit/assistant-dot.test.ts`; verify `npm test` passes with no orphaned stubs
- [x] 5.5 Remove the seeded `storageState` from `tests/e2e/global-setup.ts` and `playwright.config.ts`, since a clean context is no longer treated as a first visit; verify `npm run test:e2e` passes without it
- [x] 5.6 Run `npm test` and `npm run build`; verify both pass
- [x] 5.7 Confirm in a clean browser profile that the panel stays shut on a first visit and the dot is showing instead; verify clicking the control still opens it and clears the dot
- [x] 5.8 Update `handoff.md`: the auto-open decision in section 3 and its layout entry go, the Playwright first-visit gotcha in section 8 goes, and the test counts change

## 6. The dot returns on a refresh

Added after group 5, when the cue's lifetime changed from per browsing session
to per page load. Supersedes the session flag built in groups 1 and 2.

- [x] 6.1 Delete `app/utils/assistant-panel-opened.ts` and its test; verify no reference to it or its two functions remains
- [x] 6.2 Make `showDot` plain store state defaulting to true, and drop `initDot()` and the layout's call to it; verify a rebuilt store shows the dot again
- [x] 6.3 Keep `openDrawer()` clearing the dot, and confirm closing the panel does not bring it back within a page load; verify with unit tests
- [x] 6.4 Rework `tests/unit/assistant-dot.test.ts` for the new lifetime, including a refresh case; verify `npm test` passes
- [x] 6.5 Run `npm run build` and `npm run test:e2e`; verify both pass
- [x] 6.6 Confirm in a browser that the dot shows on load, clears on a click, stays clear across an in-app navigation, and returns after a reload
- [x] 6.7 Update `handoff.md` for the new lifetime and the test count
