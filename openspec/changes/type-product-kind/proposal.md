## Why

`products.kind` is `text` with a check constraint holding it to `'physical'` or
`'digital'`. `supabase gen types` cannot see a check constraint, so the
generated row says `kind: string`, and every query that reads a product comes
back wider than the database will ever return.

`server/utils/rows.ts` exists to close that gap in TypeScript, narrowing a row
at the one point it leaves a query. It works, but it is a second statement of a
rule the database already enforces, and two statements of one rule drift.

**This change touches the Supabase schema.** It converts one column's type on a
live table.

## What Changes

- **A `product_kind` Postgres enum** with the two values the check constraint
  already allows, and `products.kind` converted to it.
- **`products_kind_check` dropped**, since the type then says the same thing and
  says it to the type generator as well.
- **`server/types/database.ts` regenerated**, after which a products row reads
  `kind: 'physical' | 'digital'` on its own.
- **`productKind()` and `withProductKind()` deleted from
  `server/utils/rows.ts`**, along with their call sites and tests.

## What This Does Not Change

- **No behaviour a visitor sees.** The same two kinds, the same rules about
  each, the same prices and the same order flow. This is why the change carries
  `skip_specs`.
- **`withFileFacts()` stays**, and this is the part worth reading before
  assuming the file can go. `rows.ts` narrows two things, and an enum closes
  only one of them. The second is the `products_file_fields_check` constraint
  tying `file_name`, `file_format` and `file_size_bytes` to the kind: a digital
  row carries all three, a physical row carries none. Postgres has no type that
  expresses a conditional nullability across columns, so the generated types
  will still say `string | null` for all three whatever we do to `kind`. The
  root `tasks.md` entry that prompted this change said the enum "would delete
  `server/utils/rows.ts`". It deletes about half of it.

## Non-goals

- **No third kind.** Adding one is a product decision, not this change.
- **No other check constraint becomes an enum.** `orders.status` is the obvious
  candidate and is read or written by nothing, so typing it buys nothing today.
- **No change to `create_order`.** It compares `kind` to string literals, which
  an enum accepts unchanged.

## Risks

- **The conversion runs on the live table**, which is the production storefront's
  only database, and both shops share it until they are split. It is one
  `ALTER TABLE ... TYPE ... USING`, it holds a brief lock on a 15-row table, and
  it fails loudly rather than silently if any row holds an unexpected value.
- **It is reversible**, by converting the column back to `text` and restoring the
  check constraint, but the reversal is another migration against production
  rather than a revert of a commit.
- **The generated types cannot be regenerated until the migration is applied**,
  because `supabase gen types` reads the live database and not
  `supabase/schema.sql`. So the code change and the migration cannot land
  separately: schema first, then types, then the deletions, in one commit.
