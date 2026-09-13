## 1. The branch

- [x] 1.1 Push `main` so the fork point matches what both shops are serving; verify CI is green and `SMOKE_SHOP=demo` and `SMOKE_SHOP=fif` both pass before branching
- [x] 1.2 Create `fif` from that commit and push it; verify `git branch -a` shows it tracking `origin/fif`
- [x] 1.3 Protect `main` and `fif` against deletion and force-push, leaving direct pushes allowed and requiring no status check; verify by attempting `git push origin --delete fif` and reading the refusal
- [x] 1.4 Set the `forged-in-filament` Vercel project's Production Branch to `fif` **(dashboard only, the CLI cannot)**; verify a push to `fif` produces a production deployment on `fif.bobdempsey83.com` and a push to `main` produces no deployment for that project
      *The setting lives under Environments, then Production, then Branch Tracking, not on the Git page. Proved from deployment metadata rather than the page: the `fif` push before the change built `target: null`, a preview, and the one after built `target: production` with `githubCommitRef: fif`.*
- [x] 1.5 Set that project's Framework Preset to Nuxt while in its settings, which reads "Other" today; verify the next build still serves the shop

## 2. What the branches need to know about each other

- [x] 2.1 Run CI on both branches; verify a push to `fif` triggers the workflow, which it did not before
- [x] 2.2 Point each branch's `.mcp.json` at its own shop's Supabase project, the demo's on `main` and the real shop's on `fif`; verify each branch's file names the right project and that the difference is recorded as deliberate
- [x] 2.3 Give `AGENTS.md` and `CLAUDE.md` the branch rules, since neither mentioned branches at all; verify both say to check the current branch before writing code and that shop work never lands on `main`

## 3. Undo what the old decision wrote down

- [x] 3.1 Reverse the decision record in `handoff.md`, keeping what it said and why the premise changed rather than deleting it; verify the strike-through convention matches the rest of the file
- [x] 3.2 Correct the currency heuristic in `handoff.md`, which says `git status -sb` tells you whether production is current; verify it now says that answers for one shop only and that the wrong branch gives a false all-clear
- [x] 3.3 Rewrite the README's multi-shop section to ask whether the shop will diverge, rather than telling an adopter to use one branch; verify it names the Production Branch step and what happens if it is missed
- [x] 3.4 Rewrite the root `tasks.md` section that assumed one push updates both shops; verify no line still implies it
- [x] 3.5 Modify `storefront/shop-identity`, whose first requirement says identity comes from configuration "so two shops can run the same build"; verify the requirement still forbids one shop touching another's data whether or not they share a build

## 4. Verification

- [x] 4.1 Commit a visible change on `fif` only and push it; verify it appears on `fif.bobdempsey83.com` and is absent from the demo
      *The first attempt used an HTML comment, which Vue strips from a production build, so it proved nothing and was reverted. Deployment metadata is the check that works: branch, commit and target, all three of which the platform records.*
- [ ] 4.2 Push a commit to `main`; verify the demo updates and the `forged-in-filament` project builds nothing
- [ ] 4.3 Run `npm run check` on both branches; verify both pass
- [ ] 4.4 Run `SMOKE_SHOP=demo` and `SMOKE_SHOP=fif`; verify 6 checks each, and that the fif run reports no deployment banner, which is what would appear if its pushes had become Preview deployments
- [ ] 4.5 Update `handoff.md` and the root `tasks.md` with what shipped and what was decided
