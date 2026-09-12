# What the typed client rejected

`server/utils/supabase.ts` now returns `SupabaseClient<Database>`. This is the
first `npm run typecheck` after that change, recorded before anything was fixed.

Five distinct errors. The raw log repeats each one three times, once per Nuxt
typecheck project (app, server, shared); the tests project added none.

## 7.1 The list, verbatim

```
server/api/orders.post.ts(103,5): error TS2322: Type 'string | null' is not assignable to type 'string | undefined'.
  Type 'null' is not assignable to type 'string | undefined'.

server/api/products.get.ts(76,5): error TS2322: Type '({ id: string; slug: string; name: string; description: string | null; price_cents: number; image_url: string | null; in_stock: boolean; kind: string; file_name: string | null; file_format: string | null; file_size_bytes: number | null; } & { ...; })[]' is not assignable to type 'Product[]'.
  Type '... & { ...; }' is not assignable to type 'Product'.
    Type '... & { ...; }' is not assignable to type 'DigitalProduct'.
      Types of property 'kind' are incompatible.
        Type 'string' is not assignable to type '"digital"'.

server/api/products/[slug].get.ts(8,19): error TS2345: Argument of type 'string | undefined' is not assignable to parameter of type 'string'.
  Type 'undefined' is not assignable to type 'string'.

server/utils/assistant.ts(390,74): error TS2345: Argument of type '{ id: string; slug: string; name: string; description: string | null; price_cents: number; in_stock: boolean; kind: string; file_name: string | null; file_format: string | null; file_size_bytes: number | null; }' is not assignable to parameter of type 'CatalogueRow'.
  Types of property 'kind' are incompatible.
    Type 'string' is not assignable to type '"physical" | "digital"'.

server/utils/assistant.ts(398,32): error TS2345: (the same error, on the `get_product` branch)
  Types of property 'kind' are incompatible.
    Type 'string' is not assignable to type '"physical" | "digital"'.
```

## 7.2 What each one is

| File and line | Real mismatch or typing gap | What it is |
| --- | --- | --- |
| `server/api/products/[slug].get.ts:8` | **Real mismatch** | `getRouterParam(event, 'slug')` returns `string \| undefined` and the route passed it straight into `.eq('slug', slug)`. A request that reaches the handler with no slug would have queried for `undefined`. The untyped client accepted it. |
| `server/api/orders.post.ts:103` | **Gap, with a real call behind it** | The call passes `p_promo_code: promoCode \|\| null`. `create_order` declares `p_promo_code text default null` and starts with `coalesce(p_promo_code, '')`, so null is fine at runtime, but `supabase gen types` writes a defaulted argument as optional (`p_promo_code?: string`) and never as nullable. The argument name and the return are otherwise typed correctly. |
| `server/api/products.get.ts:76` | **Gap** | Same cause as the two below. |
| `server/utils/assistant.ts:390` | **Gap** | Same cause. |
| `server/utils/assistant.ts:398` | **Gap** | Same cause. |

Three of the five are one gap. `products.kind` is `text` with a check
constraint, not a Postgres enum:

```sql
alter table public.products add column if not exists kind text not null default 'physical';
alter table public.products add constraint products_kind_check check (kind in ('physical', 'digital'));
```

`supabase gen types` reads enums, not check constraints, so every row it hands
back carries `kind: string`. Our own `Product` union and `CatalogueRow` both say
`'physical' | 'digital'`, which is the stronger and correct statement, so the
generated row will not go into them.

Turning the column into a Postgres enum would close the gap at the source and
the generated types would then carry the union. That is a schema change, which
this proposal rules out, so it is left as a follow-up.

## What was done about them

The two real items are fixed in the code: the slug route now 404s on a missing
slug instead of querying for `undefined`, and the RPC call omits `p_promo_code`
rather than sending an explicit null.

The kind gap is closed with one narrowing function, `productKind()` in
`server/utils/rows.ts`, applied where a product row leaves a query. It checks
the value rather than casting, so the check constraint is restated in TypeScript
at the one point where the database's word for it stops being visible.
