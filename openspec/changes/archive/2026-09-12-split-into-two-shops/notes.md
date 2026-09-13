# Group 2 notes: the demo's own database

Working notes from the stream that moved the demo onto its own Supabase
project. Findings 3, 4 and 12 of the agreed report are recorded here so they
survive the session.

## Outcome

Done, 2.1 through 2.6. The demo at `ai-storefront.bobdempsey83.com` now reads
and writes `ai-storefront-demo` (`qtzwrwstixqgnuixfajp`, `us-east-2`).
`wfhhkdmgouyxnrxnbaeo` was not repointed, and nothing in it was deleted.

## What the plan got wrong

**The Supabase MCP server cannot do this stream's work.** The briefing calls
Group 2 the stream another session cannot run, because it needs the MCP server
and that server's per-session browser OAuth. Authorisation was never the
problem. Scope was.

`.mcp.json` pins the server to
`https://mcp.supabase.com/mcp?project_ref=wfhhkdmgouyxnrxnbaeo&features=database,docs`,
and each half of that is on its own fatal to the plan as written. `project_ref`
is fixed to the **real shop**, so every `apply_migration` and `execute_sql` call
lands there, which is the one thing this stream must never do.
`features=database,docs` omits the account group, so no `create_project` tool
exists to carry out 2.1 with.

The server was authorised and healthy, and its tools are `list_tables`,
`list_extensions`, `list_migrations`, `execute_sql`, `apply_migration` and
`search_docs`. All of them useful here only for reading the old project, which
is how the two cross-checks in 2.6 and the schema comparison below were done.

**`SUPABASE_ACCESS_TOKEN` is scoped to the old project too.** It reaches
`GET /v1/projects` and returns `wfhhkdmgouyxnrxnbaeo` alone, not the two
projects the account actually has. `POST /v1/projects` returns `403 Forbidden`,
`GET /v1/organizations` returns an empty list, and
`supabase gen types --project-id qtzwrwstixqgnuixfajp` fails with
`LegacyGenTypesUnexpectedStatusError: Your account does not have the necessary
privileges to access this endpoint`.

So both routes the plan implies were closed. The work was done through the
Supabase dashboard in a browser: the project created on the New Project form,
and `schema.sql`, `seed.sql` and every check pasted into the SQL Editor.

**What the next shop needs.** Standing up a third shop by this route needs
either a human at the dashboard or a personal access token with organisation
scope. It also needs `.mcp.json` repointed and the session restarted before the
MCP server is any use against the new project. That step is missing from the
plan and belongs in front of 2.2.

## Finding 3: applying schema.sql and seed.sql

`supabase/schema.sql`, all 437 lines, pasted unchanged into the SQL Editor and
run in one go. Result: **Success. No rows returned.** No error, no retry, and
nothing run out of the order the file lists.

`supabase/seed.sql` the same way, also clean.

One mechanical note worth keeping: paste, never type. The SQL Editor is
CodeMirror and auto-indents and auto-closes quotes, so typed SQL arrives
corrupted. Putting the file on the clipboard and pressing Ctrl+V puts all 437
lines in intact.

## Finding 4: RLS on the new project

Every table has RLS enabled. Policy counts, read from `pg_policies`:

| table | RLS | policies |
| --- | --- | --- |
| `products` | on | 1 |
| `store_settings` | on | 1 |
| `orders` | on | 0 |
| `order_items` | on | 0 |
| `email_subscribers` | on | 0 |
| `promo_codes` | on | 0 |
| `promo_redemptions` | on | 0 |

Both policies are `SELECT` to `{anon, authenticated}`: `products are public` and
`store settings are public`. The other five tables carry RLS with no policy at
all, which is what makes them unreachable from a browser; the Nitro server
reaches them with the service-role key, which bypasses RLS.

`create_order` exists with the current signature,
`(p_customer jsonb, p_items jsonb, p_promo_code text, p_is_test boolean)`.

**Task 2.2 asks for the wrong check.** It says to verify `products` is the only
publicly readable table. Two tables are publicly readable, by design, and
`schema.sql` carries a comment saying so. The check that means something is
"`products` and `store_settings` are the only tables with a policy, and both
policies are select-only".

**Task 2.3 credits the wrong file.** It asks to run `seed.sql` and then verify
`store_settings` and `promo_codes` carry their default rows. Neither row comes
from `seed.sql`. `schema.sql` inserts both, the singleton `store_settings` row
at its line 133 and `WELCOME25` at its line 193, each guarded against a re-run.
`seed.sql` inserts products and nothing else, so both rows are already there at
the end of 2.2 and their absence after 2.3 would point at a failed schema, not a
failed seed.

## Finding 12: everything else the plan did not cover

**The organisation is on the Free plan and already had two projects**,
`forged in filament` and an unrelated paused `Budget App`. The new project is
the third. It created without an upgrade prompt and the org still reads FREE,
but that is a standing cost question for whoever owns the account, and the plan
never mentions it.

**A UTF-8 BOM in a piped secret took the demo down, and it is the more useful
version of the empty-string warning.** Piping the service key through
PowerShell's `Get-Clipboard | vercel env add` prepended U+FEFF. Vercel stored
it, the build succeeded, and every Supabase call failed at runtime with

```
TypeError: Cannot convert argument to a ByteString because the character
at index 0 has a value of 65279 which is greater than 255
```

from `_Headers.set` inside `@supabase/supabase-js`. `/api/products` returned 502
and the live demo served no catalogue. `vercel env ls` looked perfectly healthy
throughout, exactly as it does for an empty string.

The fix is to write the value to a file with no BOM and redirect it:
`vercel env add NAME production < value.txt`, checking the file with
`od -c | head -1` first. On Windows, never pipe a secret from PowerShell into a
native command.

**The legacy `service_role` JWT was chosen over the new `sb_secret_` key.** The
new project offers both. The old project uses the legacy JWT, so taking the same
kind keeps the repoint to one variable changing value rather than a variable
changing value and shape at once. Supabase marks these deprecated, so migrating
both shops to secret keys is a change worth making on purpose later.

**`scripts/db-types.mjs` hardcodes `PROJECT_REF = 'wfhhkdmgouyxnrxnbaeo'`.**
Task 2.5 treats `npm run db:types` producing no diff as evidence the new
project's schema matches. It is not: the script reads the **old** project, so it
would produce no diff whatever the new project contained. It was run, and there
is no diff, which is worth knowing but proves only that the real shop has not
drifted.

The check that does prove it is a direct comparison. The same fingerprint query
run against both projects returns the same answer:

```
md5 over table.column:type:nullable:udt for every base table in public
old wfhhkdmgouyxnrxnbaeo  07bab637266c8624c59c256156f858f5  48 columns
new qtzwrwstixqgnuixfajp  07bab637266c8624c59c256156f858f5  48 columns
```

Two shops mean the hardcoded ref has to go, and the script needs to take a ref
or read one from the environment. That belongs to whoever picks up group 5.

**The database password was generated by the dashboard and not recorded.**
Nothing in the app uses it; the service key is what the server holds. Reset it
from Settings, Database if it is ever needed.
