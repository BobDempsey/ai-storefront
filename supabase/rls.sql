-- Row-level security, for the Supabase backend only.
--
-- Apply this after schema.sql on a Supabase project. Do not apply it on Neon,
-- and do not read that as the Neon path being protected by something else: it
-- is not, and this is the one difference between the two backends.
--
-- What these policies actually defend is PostgREST. On Supabase every table is
-- reachable over HTTP by anyone holding the project's publishable key, so a
-- table with RLS off is a table the internet can read. This storefront has
-- never shipped that key: there is no browser-side Supabase client, no auth and
-- no realtime, and every query runs server-side through the service-role key,
-- which bypasses RLS entirely. So the policies below have never been what stops
-- a visitor reading the orders table. They are the second lock on a door the
-- app does not open.
--
-- Neon exposes no such endpoint. Its Postgres is reachable only by connection
-- string, the connection string is a server-only credential, and no request
-- from a browser can reach a table at all. There is nothing for a policy to
-- defend, which is why the Neon path omits these statements rather than
-- reimplementing them.
--
-- What that gives up, said plainly: on Supabase, a future mistake that shipped
-- a publishable key to the browser would be caught by these policies, and on
-- Neon the equivalent mistake would be shipping the connection string, which
-- nothing would catch. Defence in depth is genuinely lower on Neon. The trade
-- was made knowingly; see design.md and handoff.md in this repo.

-- Catalog is world-readable; everything else is unreachable from the browser.
-- The service role key used by the Nitro server bypasses RLS.
alter table public.products         enable row level security;
alter table public.orders           enable row level security;
alter table public.order_items      enable row level security;
alter table public.email_subscribers enable row level security;

drop policy if exists "products are public" on public.products;
create policy "products are public"
  on public.products for select
  to anon, authenticated
  using (true);

-- Readable by the storefront the same way products are; writes stay staff-only
-- through the Supabase dashboard, which uses the service-role key.
alter table public.store_settings enable row level security;

drop policy if exists "store settings are public" on public.store_settings;
create policy "store settings are public"
  on public.store_settings for select
  to anon, authenticated
  using (true);

-- No policies, like email_subscribers: unreachable from the browser, readable
-- only through the service-role key the Nitro server holds. A visitor must
-- never be able to list codes they were not sent.
alter table public.promo_codes       enable row level security;
alter table public.promo_redemptions enable row level security;

-- Belt-and-braces beside the revoke from PUBLIC in schema.sql, in case an
-- explicit grant is ever added. `anon` and `authenticated` are Supabase's own
-- roles and do not exist on a plain Postgres, which is the whole reason this
-- one line sits here and its neighbour does not.
revoke execute on function public.create_order(jsonb, jsonb, text, boolean) from anon, authenticated;
