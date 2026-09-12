> **Applied 2026-09-12.** The Supabase MCP server was authorised by browser
> OAuth and `apply_migration` ran against `wfhhkdmgouyxnrxnbaeo`. The first
> attempt aborted, changing nothing, because two other check constraints mention
> `kind`; see the note under 1.2 and the added section in `design.md`.

## 1. The schema

- [x] 1.1 Write the enum, the dropped check constraint and the column conversion into `supabase/schema.sql`, in the `Product kinds` section beside the constraint they replace; verify the file still reads as something that stands up a fresh project and upgrades an existing one
- [x] 1.2 Apply it to the live project through the Supabase MCP server's `apply_migration`; verify the call returns without error
      *First attempt failed with `operator does not exist: product_kind = text` and rolled back. `products_file_fields_check` and `products_digital_in_stock_check` are stored with the literal cast to `text`, so they have to be dropped before the conversion and added back after it. The second attempt returned `{"success":true}`.*
- [x] 1.3 Read the column back and confirm its type is `product_kind` and its default is `'physical'`; verify by selecting `data_type` and `column_default` from `information_schema.columns`
- [x] 1.4 Confirm all 15 rows survived with the kind they had: 12 `physical` and 3 `digital`; verify with a `group by kind` count against the numbers in `supabase/seed.sql`

## 2. The types

- [x] 2.1 Run `npm run db:types`; verify the regenerated `server/types/database.ts` says `kind: Database["public"]["Enums"]["product_kind"]` rather than `string`
- [x] 2.2 Run `npm run typecheck` before deleting anything; verify it still passes, since a narrower type reaching wider code is not itself an error
      *It did not pass. `countMatching()` in `server/api/products.get.ts` typed its `kind` parameter as `string` and passed it to `.eq('kind', kind)`, which the narrower column type now rejects. Fixed by typing the parameter `ProductKind`.*

## 3. The code that is no longer needed

- [x] 3.1 Delete `productKind()` and `withProductKind()` from `server/utils/rows.ts` and their call sites; verify a grep for both names finds nothing outside the archive
- [x] 3.2 Delete the unit tests covering those two functions, keeping the `withFileFacts()` tests; verify the file still tests what survives
      *Nothing to delete: `rows.ts` has no test file and never had one.*
- [x] 3.3 Confirm `withFileFacts()` is still needed rather than deleted with them; verify by checking the regenerated types still say `string | null` for the three file columns
- [x] 3.4 Check `server/utils/assistant.ts`'s `CatalogueRow` still derives correctly from the regenerated products row; verify `npm run typecheck` passes

## 4. Verification

- [x] 4.1 Run `npm run check` and `npm run build`; verify both pass
- [x] 4.2 Run `npm run test:db` against a running dev server; verify 46/46, since these are the tests that actually touch the converted column
- [x] 4.3 Run `npm run test:e2e`; verify 28/28 and that the Files tab still lists the three files and the Products tab the twelve goods
- [x] 4.4 Place one order for a physical item and one for a file on a dev server; verify both commit and that `create_order` needed no edit to compare the enum to its string literals
- [x] 4.5 Update `handoff.md` and the root `tasks.md`: the enum, what it closed, and that `withFileFacts()` survives because no Postgres type expresses conditional nullability
