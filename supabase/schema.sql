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

-- Product kinds -----------------------------------------------------------
-- A catalogue row is either a physical object or a downloadable file. Added by
-- alter so this file still stands up a fresh project and upgrades an existing
-- one. The default is what lets rows written before kinds existed keep their
-- meaning.
alter table public.products add column if not exists kind            text not null default 'physical';
alter table public.products add column if not exists file_name       text;
alter table public.products add column if not exists file_format     text;
alter table public.products add column if not exists file_size_bytes bigint;

alter table public.products drop constraint if exists products_kind_check;
alter table public.products add  constraint products_kind_check
  check (kind in ('physical', 'digital'));

-- A file row carries all three file facts and a physical row carries none, so
-- the storefront can show them without testing each one separately.
alter table public.products drop constraint if exists products_file_fields_check;
alter table public.products add  constraint products_file_fields_check
  check (
    (kind = 'digital'  and file_name is not null and file_format is not null and file_size_bytes is not null)
    or
    (kind = 'physical' and file_name is null     and file_format is null     and file_size_bytes is null)
  );

-- Supply of a file never runs out. Holding that here means create_order's
-- `and p.in_stock` join, the cart and the checkout block all keep working
-- unchanged for both kinds and cannot disagree with each other.
alter table public.products drop constraint if exists products_digital_in_stock_check;
alter table public.products add  constraint products_digital_in_stock_check
  check (kind = 'physical' or in_stock);

-- Which file an order owes, snapshotted like the name and price beside it, so
-- the record survives a rename or a deletion in the catalogue.
alter table public.order_items add column if not exists file_name_snapshot text;

create index if not exists order_items_order_id_idx on public.order_items(order_id);

-- Newsletter opt-in ---------------------------------------------------------
-- One row per subscribed address. The unique constraint holds even across a
-- race between two concurrent submissions of the same address, which a
-- check-then-insert in application code alone would not.
create table if not exists public.email_subscribers (
  id         uuid primary key default gen_random_uuid(),
  email      text not null unique,
  created_at timestamptz not null default now()
);

-- Row Level Security ------------------------------------------------------
alter table public.products         enable row level security;
alter table public.orders           enable row level security;
alter table public.order_items      enable row level security;
alter table public.email_subscribers enable row level security;

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
  v_wanted   integer;
begin
  -- An order with no lines is never valid, and the row-count guard below cannot
  -- catch it (0 matched = 0 wanted), so reject it up front.
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'empty_order';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_items) as i(product_id uuid, quantity integer)
    where i.product_id is null or i.quantity is null or i.quantity < 1
  ) then
    raise exception 'invalid_item';
  end if;

  -- Distinct products asked for. Duplicate ids are summed rather than rejected,
  -- so this count -- not the raw array length -- is what the join must match.
  select count(distinct i.product_id) into v_wanted
  from jsonb_to_recordset(p_items) as i(product_id uuid, quantity integer);

  -- A file is emailed once, so a second copy is nothing the buyer does not
  -- already have. The storefront caps this as well; only a client that bypasses
  -- it reaches here, which is why this reuses invalid_item rather than adding a
  -- fourth error the route would have to map.
  if exists (
    select 1
    from (
      select i.product_id, sum(i.quantity)::integer as quantity
      from jsonb_to_recordset(p_items) as i(product_id uuid, quantity integer)
      group by i.product_id
    ) w
    join products p on p.id = w.product_id
    where p.kind = 'digital' and w.quantity > 1
  ) then
    raise exception 'invalid_item';
  end if;

  insert into orders (customer_name, customer_email, customer_phone, notes)
  values (
    p_customer->>'name',
    p_customer->>'email',
    nullif(p_customer->>'phone', ''),
    nullif(p_customer->>'notes', '')
  )
  returning id into v_order_id;

  insert into order_items (order_id, product_id, name_snapshot, file_name_snapshot, unit_price_cents, quantity)
  select v_order_id, p.id, p.name, p.file_name, p.price_cents, w.quantity
  from (
    select i.product_id, sum(i.quantity)::integer as quantity
    from jsonb_to_recordset(p_items) as i(product_id uuid, quantity integer)
    group by i.product_id
  ) w
  join products p on p.id = w.product_id and p.in_stock;

  get diagnostics v_matched = row_count;
  if v_matched <> v_wanted then
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
