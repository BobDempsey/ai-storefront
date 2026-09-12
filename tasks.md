# Remaining tasks

## Now: ai-storefront.bobdempsey83.com

- [ ] Fix the hydration mismatch. The live site logs "Hydration completed but
      contains mismatches" on the homepage and the dev server does not, so it
      only reproduces against a production build
- [ ] Clear the three duplicate auto-imports the build warns about: OrderDraft,
      CartIntent and PromoStatus are each declared in shared/types/api.ts and
      again in server/utils/, and the server copy wins
- [ ] use/using nuxt img module? Nothing is installed today and the app has
      four plain img tags, so this would be adopting @nuxt/image for the twelve
      catalogue photos
- [ ] open search dialog when user clicks into the search input

## Next: fif.bobdempsey83.com from the same repo

- [ ] Decide between a second Vercel project and a branch
- [ ] Create the second deployment with its own environment variables
- [ ] Add fif.bobdempsey83.com and its Route 53 CNAME
- [ ] Create a second Supabase project from schema.sql and seed.sql
- [ ] Point each deployment at its own database and verify the split
- [ ] Render a share image carrying the second shop's name
- [ ] Make the smoke test able to check either deployment
- [ ] Direct a custom-order request to the contact form
