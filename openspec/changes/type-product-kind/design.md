## The conversion

`supabase/schema.sql` is the source of truth and stands up a fresh project as
well as upgrading an existing one, so the enum is created conditionally and the
column converted by `alter`, matching how `kind` itself was added:

```sql
do $$ begin
  create type public.product_kind as enum ('physical', 'digital');
exception when duplicate_object then null;
end $$;

alter table public.products drop constraint if exists products_kind_check;
alter table public.products drop constraint if exists products_file_fields_check;
alter table public.products drop constraint if exists products_digital_in_stock_check;

alter table public.products
  alter column kind drop default,
  alter column kind type public.product_kind using kind::public.product_kind,
  alter column kind set default 'physical'::public.product_kind;

alter table public.products add constraint products_file_fields_check
  check (
    (kind = 'digital'  and file_name is not null and file_format is not null and file_size_bytes is not null)
    or
    (kind = 'physical' and file_name is null     and file_format is null     and file_size_bytes is null)
  );

alter table public.products add constraint products_digital_in_stock_check
  check (kind = 'physical' or in_stock);
```

Four things about that order matter.

**The default comes off first and goes back on after.** A column default is
typed, so `default 'physical'` is a `text` default and the conversion refuses to
carry it across. Dropping and restoring it in the same statement is the whole
fix, and forgetting it is the error this will hit if it hits one.

**The check constraint goes before the conversion, not after.** Leaving it in
place means Postgres re-validates a `text` predicate against a column that is no
longer `text`.

**Every other constraint that mentions `kind` comes off too.** This was found by
running the migration, which failed with `operator does not exist:
product_kind = text` and changed nothing. Postgres stores a check constraint
with the literal already cast, as `kind = 'digital'::text`, and rebuilding that
against an enum column has no operator to use. `products_file_fields_check` and
`products_digital_in_stock_check` are both in that position, so they are dropped
before the conversion and added back after it, where the same literals coerce to
the enum.

**`using kind::public.product_kind` fails loudly on an unexpected value.** That
is the safety property worth keeping: if any row held something outside the two
values, the migration aborts and changes nothing, rather than coercing it.

## Why an enum rather than a domain or a lookup table

A `domain` over `text` would carry the constraint but generate as `string`
again, which is the problem. A lookup table with a foreign key would generate as
`string` too, and would add a join to every catalogue query to buy nothing. The
enum is the only one of the three that the type generator can read.

The cost of an enum is that adding a value later is `alter type ... add value`,
which cannot run inside a transaction block in older Postgres. With two values
that have been stable since the kinds were introduced, and a non-goal saying a
third kind is a separate decision, that is an acceptable trade.

## What the code loses

`productKind()` and `withProductKind()` in `server/utils/rows.ts` and their call
sites. There are no unit tests to delete: `rows.ts` has never had a test file of
its own. The function that stays is called `withProductFiles()`; the
proposal and the tasks both call it `withFileFacts()`, which is a name the code
has never used. It stays for the
reason in the proposal: no Postgres type expresses "these three columns are
non-null exactly when `kind` is `'digital'`", so the generated types keep saying
`string | null` and something has to narrow it.

`create_order` needs no edit. Comparing an enum column to a string literal is
valid: Postgres coerces the literal to the enum type.

## Ordering, and why it is one commit

`supabase gen types` reads the live database, not `supabase/schema.sql`. So the
sequence is: write the SQL, apply it, regenerate, delete the now-dead code, run
everything. Landing the SQL without applying it would leave `schema.sql`
describing a database that does not exist, which is worse than not starting.

## Rollback

```sql
alter table public.products drop constraint if exists products_file_fields_check;
alter table public.products drop constraint if exists products_digital_in_stock_check;

alter table public.products
  alter column kind drop default,
  alter column kind type text using kind::text,
  alter column kind set default 'physical';

alter table public.products add constraint products_kind_check
  check (kind in ('physical', 'digital'));

alter table public.products add constraint products_file_fields_check
  check (
    (kind = 'digital'  and file_name is not null and file_format is not null and file_size_bytes is not null)
    or
    (kind = 'physical' and file_name is null     and file_format is null     and file_size_bytes is null)
  );

alter table public.products add constraint products_digital_in_stock_check
  check (kind = 'physical' or in_stock);

drop type if exists public.product_kind;
```

Then `git revert` the commit and regenerate the types. Reversal is a migration
against production, not just a revert, which is why the proposal calls it out.
