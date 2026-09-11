# Remaining tasks

## Now: ai-storefront.bobdempsey83.com

- [x] Rename the project in package.json and the README
- [x] Rename the GitHub repo and update the git remote URL
- [ ] Rename the Vercel project in the dashboard, then re-link with vercel link
- [ ] Rename the local folder to ai-storefront (do it between sessions)
- [x] Set NUXT_PUBLIC_STORE_NAME to "AI Storefront" in .env
- [ ] Set NUXT_PUBLIC_STORE_NAME on Vercel and redeploy
- [ ] Add ai-storefront.bobdempsey83.com to the Vercel project
- [ ] Add the Route 53 CNAME and wait for Vercel to issue the certificate
- [ ] Decide which domain Resend verifies, then add its SPF/DKIM records in Route 53
- [ ] Point NUXT_ORDER_FROM_EMAIL at the verified domain, in .env and on Vercel
- [ ] Redeploy, since adding an env var does not rebuild an existing deployment
- [ ] Update the smoke test URL, the README and handoff.md for the new domain
- [ ] Place a test order and confirm the buyer email reaches a non-account address
- [ ] Add Open Graph tags and a share image, so a texted link previews properly

## Next: fif.bobdempsey83.com from the same repo

- [ ] Decide whether the second shop is a second Vercel project or a branch
- [ ] Create the second Vercel deployment and give it its own environment variables
- [ ] Add fif.bobdempsey83.com and its Route 53 CNAME
- [ ] Create a second Supabase project for AI Storefront from schema.sql and seed.sql
- [ ] Point each deployment at its own Supabase project and verify they cannot see each other's orders
- [ ] Make the smoke test able to check either deployment
