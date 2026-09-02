## Context

See proposal.md for motivation. The constraints that shape the approach:

- `create_order` in `supabase/schema.sql` is the single source of truth for
  pricing. It joins `products` to price and snapshot each line inside one
  transaction. Anything that adds a second place a price can come from breaks
  that guarantee.
- `order_items` already snapshots `name_snapshot` and `unit_price_cents`, so an
  order stays readable after the catalogue changes underneath it.
- The catalogue is world-readable through one RLS select policy. Orders are
  reachable only through the service-role key on the server.
- `supabase/schema.sql` is not a migration series. It is one file run by hand in
  the SQL editor, and it is already written to be re-runnable (`create table if
  not exists`, `create or replace function`).
- The storefront index fetches the whole catalogue once through
  `/api/products`. There are six rows.

## Goals / Non-Goals

**Goals:**

- One catalogue, one cart, one order path, whatever the kind.
- File facts live in the database so staff control them without a deploy.
- An order stays a complete record of what was sold, including which file was
  owed, after the catalogue row changes or is deleted.

**Non-Goals:**

- Any storage, upload, download or delivery mechanism. See proposal.md, which
  rules these out.
- Reworking how availability is decided. `ordering/cart-availability` holds as
  written.
- A general product-type system. There are two kinds and no third is planned.

## Decisions

### One `products` table with a `kind` column, not a separate `files` table

A second table would need its own price column, its own join inside
`create_order`, and its own foreign key from `order_items`. That splits pricing
across two sources and turns one join into a union, which is the one thing the
schema comment says not to do. A column keeps the RPC's join intact and the
cart storing nothing but product ids.

Alternatives considered: a `files` table with a shared `catalog_items` parent
(correct in the abstract, three tables to price a line, unjustified at six
rows); a `jsonb` metadata column (unqueryable, untyped, and hides the fields
staff have to fill in).

### `kind text not null default 'physical'` with a check constraint

A check constraint over `('physical','digital')` rather than a Postgres enum
type. Adding a value to an enum is a type migration; adding one to a check is
one `alter table`. The default is what lets the six existing rows keep working
without a data backfill, which is the whole reason the spec says a missing kind
means physical.

### File facts as three nullable columns, size in bytes

`file_name text`, `file_format text`, `file_size_bytes bigint`, all nullable and
meaningful only when `kind = 'digital'`. Size is stored as bytes and formatted
for display in `app/utils/`, next to `formatMoney`. The precedent is already
here: prices are stored in cents and formatted at the edge. Storing `"24.8 MB"`
would put presentation in the database and make sizes unsortable.

A check constraint enforces the pairing: a digital row must have all three, a
physical row must have none. That keeps the spec's "physical objects show no
file details" true at the data layer rather than by the page remembering to
hide them.

### A file is never out of stock, enforced by the database

`in_stock` stays one column for both kinds, and a check constraint requires it
to be true when `kind = 'digital'`. The alternative was to leave it to
convention and let the page ignore stock for files. A constraint means the
cart, the checkout block and `create_order`'s `join products p on ... and
p.in_stock` all keep working unchanged and cannot disagree with each other.

### The one-per-file cap is enforced in the cart and re-checked in the RPC

The cart store refuses to raise a file line above one, and the cart page renders
a fixed quantity of one for a file with only the remove control beside it.
`create_order` re-checks it and raises the existing `invalid_item` for a file
line above one.

Reusing `invalid_item` rather than adding a fourth error keeps the function's
three-error contract, which `ordering/failure-reporting` and the route's error
mapping both rely on. No customer reaches it through the storefront, so it needs
no message of its own; it exists for a caller that bypasses the page. A check
constraint cannot do this job: `order_items` holds a product id, and a check
cannot join `products` to learn the kind.

Alternatives considered: clamping a quantity above one back to one (changes the
total from what the customer submitted without telling them); a fourth named
error (a new branch in the route and a new sentence in the failure spec, for a
path only a tampering client can reach).

### The file name is snapshotted onto `order_items`

Add `file_name_snapshot text` to `order_items`, written by `create_order` from
the joined product row, in the same statement that already snapshots the name
and price. The staff email reads it from `order_items` rather than joining back
to `products`.

The alternative, joining `products` at email time, is less code and loses the
record: rename or delete a file row and old orders stop saying what was owed.
The table already snapshots for exactly this reason, so this follows it rather
than inventing a second rule. `create_order` is `create or replace`, so the
change is one edit to a function that is already re-runnable.

### The index keeps one fetch and splits by kind in the page

`/api/products` keeps returning the whole catalogue, and `app/pages/index.vue`
partitions it into the two tabs with two computed properties. A `?kind=` filter
would mean two round trips to render a page that currently makes one, for six
rows.

### The format icon is derived, not stored

The mock stored a PrimeIcons class per entry. The page maps format to icon
instead, with a fallback for an unknown format. Icon classes are presentation
and would tie the database to PrimeVue's icon set.

## Risks / Trade-offs

- **A check constraint rejects a partially filled file row, and staff meet that
  as a raw Postgres error in the Supabase dashboard.** → Accepted. The dashboard
  is the admin UI by decision, the error names the constraint, and the
  alternative is a half-described file appearing in the shop.
- **File rows have no image, so the Files tab and the product detail page must
  both render without one.** → The Files tab is already an icon-and-text layout.
  The detail page needs an explicit no-image branch; it is in the tasks.
- **Nullable columns that are only meaningful for one kind.** → The check
  constraint makes the pairing explicit, and the alternative table split costs
  more than it saves at this size.
- **`create_order` changes, and it is the most load-bearing code in the
  project.** → The edits are one column on one insert list and one guard beside
  the two that are already there. The handoff records
  a seven-case regression suite for this function; re-running it after the
  change is a task.
- **Buyers may expect an immediate download.** → The spec requires the delivery
  wording wherever a file can be added to the cart and again on the
  confirmation, and no download control exists to imply otherwise.

## Migration Plan

`supabase/schema.sql` gains idempotent `alter table ... add column if not
exists` statements and the check constraints, placed after the `create table`
blocks, so one file still stands up a fresh project and also upgrades the
existing one. Running it against the current database adds the columns, defaults
the six rows to `physical`, and replaces `create_order`.

`supabase/seed.sql` gains file rows and keeps `on conflict (slug) do nothing`,
so it stays safe to re-run.

Rollback is dropping the added columns and re-running the previous
`create_order`. Nothing reads them until the app is deployed, so the schema can
go first.

## Open Questions

- Whether a file row should be allowed an image, for a preview render of the
  model. Nothing in the specs depends on the answer, and adding it later is one
  nullable column that already exists.
