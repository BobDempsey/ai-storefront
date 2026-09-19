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

-- The kind is an enum rather than a checked text column so that
-- `supabase gen types` can see the two values and generate them as a union.
-- A check constraint is invisible to the generator; a type is not.
do $$ begin
  create type public.product_kind as enum ('physical', 'digital');
exception when duplicate_object then null;
end $$;

-- Every check constraint that mentions `kind` comes off before the conversion.
-- Postgres stores them with the literal already cast, as `kind = 'digital'::text`,
-- and rebuilding that against an enum column fails with "operator does not
-- exist: product_kind = text". The two below are added back after the
-- conversion, further down this section.
alter table public.products drop constraint if exists products_kind_check;
alter table public.products drop constraint if exists products_file_fields_check;
alter table public.products drop constraint if exists products_digital_in_stock_check;

-- A column default carries its own type, so `default 'physical'` is a text
-- default and the conversion refuses to bring it across. Dropping it and
-- restoring it in the same statement is the fix. The `using` cast is what
-- makes an unexpected value abort the conversion rather than be coerced.
alter table public.products
  alter column kind drop default,
  alter column kind type public.product_kind using kind::public.product_kind,
  alter column kind set default 'physical'::public.product_kind;

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

-- Row-level security and the policies that go with it live in rls.sql, which
-- is applied on Supabase and not on Neon. See the head of that file for why.

-- Store-wide sale --------------------------------------------------------
-- A single row holding whether a sale is on and, if so, by how much. The `id`
-- check is what makes it a singleton: a second insert can never satisfy it.
create table if not exists public.store_settings (
  id           boolean primary key default true,
  sale_active  boolean not null default false,
  sale_percent numeric not null default 0,
  constraint store_settings_singleton check (id),
  constraint store_settings_sale_percent_range check (
    sale_active = false or (sale_percent > 0 and sale_percent <= 100)
  )
);

insert into public.store_settings (id, sale_active, sale_percent)
values (true, false, 0)
on conflict (id) do nothing;

-- Promo codes -------------------------------------------------------------
-- A code a buyer types at checkout. Staff edit these rows in the Supabase
-- dashboard, the same way they flip the store-wide sale above; there is no
-- admin page. The code lived in NUXT_NEWSLETTER_PROMO_CODE until this table
-- existed, which is why the seed below carries the value that was in .env.
create table if not exists public.promo_codes (
  id         uuid primary key default gen_random_uuid(),
  code       text not null,
  percent    numeric not null,
  active     boolean not null default true,
  created_at timestamptz not null default now(),
  constraint promo_codes_percent_range check (percent > 0 and percent <= 100),
  -- Stored already normalised, so a lookup by exact match finds the same row
  -- create_order finds. Without this a row typed as " welcome25 " in the
  -- dashboard would be honoured at checkout but missed by the preview, and the
  -- buyer would be shown one price and charged another.
  constraint promo_codes_code_normalised check (code = upper(btrim(code)))
);

-- Comparison happens on the normalised form, so "welcome25", " WELCOME25 " and
-- "WELCOME25" are one code and the same code cannot be registered twice.
create unique index if not exists promo_codes_code_key
  on public.promo_codes (upper(btrim(code)));

-- One row per code-and-address pair that actually placed an order. The unique
-- index below is the enforcement, not a check-then-insert in application code:
-- two simultaneous orders with the same code and address cannot both commit.
create table if not exists public.promo_redemptions (
  id            uuid primary key default gen_random_uuid(),
  promo_code_id uuid not null references public.promo_codes(id),
  email         text not null,
  order_id      uuid not null references public.orders(id) on delete cascade,
  created_at    timestamptz not null default now()
);

create unique index if not exists promo_redemptions_code_email_key
  on public.promo_redemptions (promo_code_id, lower(btrim(email)));

-- Seeding the code that was already emailed to subscribers keeps every welcome
-- message sent before this table existed redeemable.
insert into public.promo_codes (code, percent, active)
select 'WELCOME25', 25, true
where not exists (
  select 1 from public.promo_codes where upper(btrim(code)) = 'WELCOME25'
);

-- Discount attribution -----------------------------------------------------
-- What priced an order, written once by create_order and never touched again.
-- Nullable with no default: every order written before this existed keeps null
-- across all four, which reads as "not recorded" rather than a genuine zero
-- discount. A later edit to store_settings or promo_codes cannot rewrite what
-- an already-committed order says it charged.
alter table public.orders add column if not exists discount_source     text;
alter table public.orders add column if not exists discount_percent    numeric;
alter table public.orders add column if not exists promo_code_snapshot text;
alter table public.orders add column if not exists subtotal_cents      integer;

-- Three shapes only: the legacy all-null row, a recorded zero discount, or a
-- recorded positive discount with a code present only for the 'code' source.
-- The all-null shape has to be accepted or this constraint fails on every
-- existing order the moment it is added.
alter table public.orders drop constraint if exists orders_discount_shape_check;
alter table public.orders add  constraint orders_discount_shape_check
  check (
    (discount_source is null and discount_percent is null and promo_code_snapshot is null and subtotal_cents is null)
    or
    (discount_source is null and discount_percent = 0 and promo_code_snapshot is null and subtotal_cents is not null)
    or
    (discount_source = 'sale' and discount_percent > 0 and promo_code_snapshot is null and subtotal_cents is not null)
    or
    (discount_source = 'code' and discount_percent > 0 and promo_code_snapshot is not null and subtotal_cents is not null)
  );

-- Test orders ---------------------------------------------------------------
-- Whether an automated test created this order. Tests run against this same
-- project rather than a throwaway one, so the marker is what lets a read of
-- outstanding business exclude them, and what stops a test run emailing staff.
-- Defaulting to false means a caller that knows nothing about testing cannot
-- create a test order by accident.
alter table public.orders add column if not exists is_test boolean not null default false;

comment on column public.orders.is_test is
  'True when the order was created by an automated test. Real reads of outstanding business filter on "not is_test".';

-- Partial: test rows are the rare ones and the only ones ever looked up by
-- this column, so indexing the false side would be dead weight.
create index if not exists orders_is_test_idx on public.orders (is_test) where is_test;

-- The two-argument version is dropped rather than replaced. `create or replace`
-- matches on signature, so adding p_promo_code would leave both callable, and
-- the older one would silently ignore promo codes while keeping its own grants.
drop function if exists public.create_order(jsonb, jsonb);

-- The three-argument version goes for the same reason: a defaulted fourth
-- parameter does not replace it, it overloads it, and a three-argument call
-- would then be ambiguous rather than resolving to either one.
drop function if exists public.create_order(jsonb, jsonb, text);

-- Prices each line at the better of the store-wide sale and the buyer's promo
-- code, never both. The rounding rule (round half up, on integer cents) matches
-- server/utils/pricing.ts, so the price shown to a buyer and the price
-- create_order charges never disagree.
create or replace function public.create_order(
  p_customer   jsonb,
  p_items      jsonb,
  p_promo_code text default null,
  p_is_test    boolean default false
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_id      uuid;
  v_matched       integer;
  v_wanted        integer;
  v_sale_active   boolean;
  v_sale_percent  numeric;
  v_code          text;
  v_email         text;
  v_promo_id      uuid;
  v_promo_percent numeric := 0;
  v_promo_active  boolean;
  v_percent       numeric;
  v_source        text;
  v_subtotal      integer;
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

  -- Resolve the code before anything is written, so a code that cannot be used
  -- costs nothing and leaves nothing behind.
  v_code  := nullif(upper(btrim(coalesce(p_promo_code, ''))), '');
  v_email := lower(btrim(coalesce(p_customer->>'email', '')));

  if v_code is not null then
    select id, percent, active
      into v_promo_id, v_promo_percent, v_promo_active
    from promo_codes
    where upper(btrim(code)) = v_code;

    if v_promo_id is null then
      raise exception 'unknown_promo_code';
    end if;

    if not v_promo_active then
      raise exception 'inactive_promo_code';
    end if;

    if exists (
      select 1 from promo_redemptions
      where promo_code_id = v_promo_id
        and lower(btrim(email)) = v_email
    ) then
      raise exception 'promo_code_used';
    end if;
  end if;

  select sale_active, sale_percent into v_sale_active, v_sale_percent
  from store_settings where id = true;

  -- Better of the two offers, never both, so the total can never fall below
  -- what the larger single discount produces. A code the sale beat is still
  -- redeemed below: the buyer did use it on an order.
  v_percent := greatest(
    case when v_sale_active then coalesce(v_sale_percent, 0) else 0 end,
    case when v_promo_id is not null then coalesce(v_promo_percent, 0) else 0 end
  );

  -- Which offer actually priced the order, for the record on the order row.
  -- A tie goes to the code, so promo_redemptions and this record agree about
  -- what happened on this order.
  v_source := case
    when v_percent = 0 then null
    when v_promo_id is not null and coalesce(v_promo_percent, 0) >= v_percent then 'code'
    else 'sale'
  end;

  -- Written in the same insert as the rest of the order, so an order either
  -- records what it is or does not exist.
  insert into orders (customer_name, customer_email, customer_phone, notes, is_test)
  values (
    p_customer->>'name',
    p_customer->>'email',
    nullif(p_customer->>'phone', ''),
    nullif(p_customer->>'notes', ''),
    coalesce(p_is_test, false)
  )
  returning id into v_order_id;

  insert into order_items (order_id, product_id, name_snapshot, file_name_snapshot, unit_price_cents, quantity)
  select
    v_order_id,
    p.id,
    p.name,
    p.file_name,
    case
      when v_percent > 0
        then round(p.price_cents * (100 - v_percent) / 100)::integer
      else p.price_cents
    end,
    w.quantity
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

  -- Written in the order's own transaction, so the unique index is what stops a
  -- second redemption even under two concurrent submissions, and a rollback for
  -- any other reason takes the redemption with it.
  if v_promo_id is not null then
    insert into promo_redemptions (promo_code_id, email, order_id)
    values (v_promo_id, v_email, v_order_id);
  end if;

  -- What the order would have totalled at catalogue prices, computed from the
  -- same rows the discounted total is computed from, so the two can never
  -- disagree about which lines they cover.
  select coalesce(sum(p.price_cents * oi.quantity), 0)
    into v_subtotal
  from order_items oi
  join products p on p.id = oi.product_id
  where oi.order_id = v_order_id;

  update orders
  set total_cents         = (
        select coalesce(sum(unit_price_cents * quantity), 0)
        from order_items where order_id = v_order_id
      ),
      discount_source     = v_source,
      discount_percent    = v_percent,
      promo_code_snapshot = case when v_source = 'code' then v_code else null end,
      subtotal_cents      = v_subtotal
  where id = v_order_id;

  return v_order_id;
end;
$$;

-- Postgres grants EXECUTE to PUBLIC by default, and on Supabase anon and
-- authenticated inherit it. Revoking PUBLIC is what actually closes the RPC to
-- the browser, and it means the same thing on any Postgres. The matching
-- revoke from the two Supabase roles is in rls.sql, because those roles exist
-- only there. This does not carry over from the dropped two-argument signature.
revoke execute on function public.create_order(jsonb, jsonb, text, boolean) from public;
