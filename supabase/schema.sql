-- MVP schema: public catalog, server-written orders.
-- Run in the Supabase SQL editor.

create extension if not exists "pgcrypto";

create table if not exists public.products (
  id            uuid primary key default gen_random_uuid(),
  slug          text unique not null,
  name          text not null,
  description   text,
  price_cents   integer not null check (price_cents >= 0),
  image_url     text,
  in_stock      boolean not null default true,
  created_at    timestamptz not null default now()
);

create table if not exists public.orders (
  id             uuid primary key default gen_random_uuid(),
  customer_name  text not null,
  customer_email text not null,
  customer_phone text,
  notes          text,
  total_cents    integer not null default 0,
  status         text not null default 'new',
  created_at     timestamptz not null default now()
);

create table if not exists public.order_items (
  id               uuid primary key default gen_random_uuid(),
  order_id         uuid not null references public.orders(id) on delete cascade,
  product_id       uuid not null references public.products(id),
  name_snapshot    text not null,
  unit_price_cents integer not null,
  quantity         integer not null check (quantity > 0)
);

create index if not exists order_items_order_id_idx on public.order_items(order_id);

-- Row Level Security ------------------------------------------------------
alter table public.products    enable row level security;
alter table public.orders      enable row level security;
alter table public.order_items enable row level security;

-- Catalog is world-readable; everything else is unreachable from the browser.
-- The service role key used by the Nitro server bypasses RLS.
drop policy if exists "products are public" on public.products;
create policy "products are public"
  on public.products for select
  to anon, authenticated
  using (true);

-- Atomic order creation. Prices come from the products table, never the client.
create or replace function public.create_order(
  p_customer jsonb,
  p_items    jsonb
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_id uuid;
  v_matched  integer;
begin
  insert into orders (customer_name, customer_email, customer_phone, notes)
  values (
    p_customer->>'name',
    p_customer->>'email',
    nullif(p_customer->>'phone', ''),
    nullif(p_customer->>'notes', '')
  )
  returning id into v_order_id;

  insert into order_items (order_id, product_id, name_snapshot, unit_price_cents, quantity)
  select v_order_id, p.id, p.name, p.price_cents, i.quantity
  from jsonb_to_recordset(p_items) as i(product_id uuid, quantity integer)
  join products p on p.id = i.product_id and p.in_stock;

  get diagnostics v_matched = row_count;
  if v_matched <> jsonb_array_length(p_items) then
    raise exception 'unavailable_item';
  end if;

  update orders
  set total_cents = (
    select coalesce(sum(unit_price_cents * quantity), 0)
    from order_items where order_id = v_order_id
  )
  where id = v_order_id;

  return v_order_id;
end;
$$;

-- Postgres grants EXECUTE to PUBLIC by default, and anon/authenticated inherit it.
-- Revoking PUBLIC is what actually closes the RPC to the browser; the second
-- revoke is belt-and-braces in case an explicit grant is ever added.
revoke execute on function public.create_order(jsonb, jsonb) from public;
revoke execute on function public.create_order(jsonb, jsonb) from anon, authenticated;
