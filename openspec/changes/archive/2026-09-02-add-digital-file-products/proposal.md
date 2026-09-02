## Why

The Files tab on the storefront index is a mock. It renders three hardcoded
entries with invented sizes, no prices, and a disabled Download button, so a
visitor is shown goods the shop cannot sell and staff have no way to add a
fourth. The shop wants to sell print files alongside printed objects, and the
tab is the only part of the storefront that promises something the app does not
do.

## What Changes

- Add a product kind to the catalogue so a row is either a physical object or a
  downloadable file. Existing rows become physical.
- Carry the facts a buyer needs about a file on the product row: the file name,
  its format and its size. These are today invented in the page.
- Split the storefront index by kind. The Products tab lists physical rows, the
  Files tab lists file rows, both from the catalogue rather than from a literal
  in the page.
- Let a file be added to the cart, priced and ordered through the existing cart
  and checkout, with no separate flow.
- Replace the disabled Download button with an Add to cart button and a line
  saying the file is emailed after payment is arranged.
- Tell staff in the order email which lines are files, so they know an email
  with an attachment is owed.
- Cap a file line at one. A second copy of the same file delivers nothing, so
  the cart holds one of each file and the quantity control is not offered for
  a file line.
- Treat a file as always orderable. `in_stock` stays on the row and stays true
  for files; nothing about the out-of-stock path changes.

Nothing here changes how an order is priced, validated or recorded.

## Non-goals

- **No file storage.** No Supabase Storage bucket, no upload, no download route,
  no signed URLs. The file itself never enters the app.
- **No automated delivery.** Staff email the file by hand after payment, the
  same way they arrange payment. Delivering a file from the app when an order is
  marked paid is a good next change and is deliberately left to one.
- **No payment.** Unchanged from phase 1: an order is a request, and money is
  handled off-app.
- **No entitlement or access control.** With no accounts and no download route,
  there is nothing to gate.
- **No mixed product.** A single catalogue row is a physical object or a file,
  never both. Selling the printed dragon and its file means two rows.
- **No admin UI.** Staff add file rows in the Supabase dashboard, as they do for
  physical products.

## Capabilities

### New Capabilities

- `catalog/digital-product`: what a downloadable file is in the catalogue, how
  the storefront presents one, that it can be bought through the same cart and
  order path as a physical product, and how staff learn a file is owed.

### Modified Capabilities

None. `ordering/cart-availability` and `ordering/failure-reporting` hold
unchanged: a file row is an ordinary catalogue row that happens to always be in
stock.

## Impact

**Supabase schema — this change alters `public.products`.** It adds a `kind`
column constrained to `physical` or `digital`, defaulting to `physical` so
existing rows keep working, plus nullable `file_name`, `file_format` and
`file_size_bytes` columns. No RLS policy changes: the catalogue is already
world-readable by select, and file rows carry nothing secret. A migration is
required, and `supabase/seed.sql` needs file rows to replace the demo entries.

Code:

- `supabase/schema.sql`, `supabase/seed.sql`
- `server/api/products.get.ts` and `server/api/products/[slug].get.ts`, which
  select the catalogue
- `server/utils/email.ts`, for the file marker on order lines
- `app/pages/index.vue`, which loses `demoFiles`
- `app/pages/products/[slug].vue`, which shows a product of either kind
- `app/types/index.ts`

No new dependency, no new environment variable.
