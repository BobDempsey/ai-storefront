# Remaining tasks

## Now: ai-storefront.bobdempsey83.com

- [ ] Set the seven environment variables on Vercel Preview, which has none
- [ ] Verify a domain in Resend and add its SPF/DKIM records
- [ ] Point NUXT_ORDER_FROM_EMAIL at that domain and redeploy
- [ ] Place a test order and confirm the buyer email arrives

## Next: fif.bobdempsey83.com from the same repo

- [ ] Decide between a second Vercel project and a branch
- [ ] Create the second deployment with its own environment variables
- [ ] Add fif.bobdempsey83.com and its Route 53 CNAME
- [ ] Create a second Supabase project from schema.sql and seed.sql
- [ ] Point each deployment at its own database and verify the split
- [ ] Render a share image carrying the second shop's name
- [ ] Make the smoke test able to check either deployment
