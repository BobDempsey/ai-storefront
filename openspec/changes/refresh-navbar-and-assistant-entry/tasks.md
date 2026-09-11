No task below needs a migration, a schema or RLS change, or a new environment
variable.

## 1. Theme control

- [x] 1.1 Replace `cycle()` with `toggle()` in `app/stores/color-mode.ts`, setting the mode from `isDark` rather than from `mode`, and keep `set()` accepting all three modes; verify by reading the store that `system` is still a settable value
- [x] 1.2 Update the `label` getter to describe the scheme in effect and the action the control performs, rather than naming `system`; verify the returned string for a `system` mode under a dark OS names dark
- [x] 1.3 Point the navbar button at `toggle()` in `app/layouts/default.vue` and reduce `themeIcon` to the sun and moon, dropping `pi-desktop`; verify no `pi-desktop` remains in the file
- [x] 1.4 Update the button's `aria-label` so it names the scheme in effect rather than the raw stored mode; verify the label for a visitor on `system` under a dark OS does not say "system"
- [x] 1.5 Add unit tests for `toggle()` in `tests/unit/` covering light to dark, dark to light, `system` under a dark OS, and `system` under a light OS; verify `npm test` passes with the four new cases

## 2. Assistant entry point

- [x] 2.1 Swap `pi-comments` for `pi-microchip-ai` on the assistant button in `app/layouts/default.vue`; verify the glyph renders in the navbar rather than showing an empty box
- [x] 2.2 Confirm no other navbar control uses the same icon; verify by grepping the layout for `pi-microchip-ai` and finding one occurrence

## 3. First-visit auto-open

- [x] 3.1 Add an `assistant-greeted` localStorage helper with read and write wrapped in `try`/`catch`, outside the assistant store's state so nothing about a conversation becomes persistable; verify a throwing storage stub makes the read return "already greeted"
- [x] 3.2 Add an `autoOpenOnce()` action that returns early when the flag is set or unreadable, fetches `/api/chat`, opens only on `available: true`, and writes the flag only when it opened; verify each of the four branches with a unit test
- [x] 3.3 Call `autoOpenOnce()` once on mount from the client-only drawer, so it never runs during SSR; verify a first load opens the panel and a reload afterwards does not
- [x] 3.4 Seed the `assistant-greeted` flag in `tests/e2e/global-setup.ts` before the suite's first navigation, so a clean Playwright context is not treated as a first visit; verify `npm run test:e2e` passes unchanged

## 4. Greeting copy

- [x] 4.1 Replace the empty-state paragraph in `app/components/AssistantDrawer.vue` with the approved greeting: "Hi, I'm the shop assistant. Ask me about anything: info on a product, what is in your cart, or how ordering works. I can add things for you and draft an order, but you confirm it yourself."; verify the panel shows it before any message is sent
- [x] 4.2 Confirm the greeting is still outside `messages` and so is never sent to the provider; verify by checking that `send()` posts only `messages` and that the greeting text appears nowhere in the store

## 5. Verification

- [x] 5.1 Run `npm test` and confirm every suite passes, including the new colour-mode and auto-open cases
- [x] 5.2 Run `npm run build` and confirm it passes
- [x] 5.3 Check the navbar and the opened panel in both light and dark against a running `npm run dev`, following the handoff's dark-mode rule that no surface is hardcoded white; verify both icons and the greeting are legible in each scheme
- [x] 5.4 Confirm the auto-open does not fire when the assistant is unconfigured, by blanking `NUXT_OPENAI_API_KEY` on a restarted dev server and loading the site in a clean browser profile
- [x] 5.5 Update `handoff.md` and the root `tasks.md` to record what shipped, including that `system` is no longer reachable from the navbar
