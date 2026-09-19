// Task 5.4: place the same cart, with the same sale and the same promo code,
// against whichever backend .env currently names, and print what the database
// recorded. Run it once per backend and compare the two outputs; the figures
// have to agree to the cent.
//
// The order goes through the real route, so the shim is in the path on the
// Neon run. The reads afterwards do not use the shim: they go straight to each
// database, so a shim that both writes and reads a wrong figure cannot agree
// with itself and call that a match.
//
// The order is a test order, so it emails nobody, and it is deleted before the
// script returns. The sale is put back to where it was found.
//
// Usage: TEST_BASE_URL=http://localhost:3002 node openspec/changes/move-fif-database-to-neon/parity-order.mjs
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import { neon } from '@neondatabase/serverless'

/** @type {Record<string, string>} */
const env = {}
for (const line of readFileSync('.env', 'utf8').split(/\r?\n/)) {
  const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim())
  if (m) env[String(m[1])] = String(m[2]).replace(/^"|"$/g, '')
}

const BASE = process.env.TEST_BASE_URL ?? 'http://localhost:3000'
const BACKEND = env.NUXT_DATABASE_BACKEND ?? 'supabase'
const TOKEN = env.NUXT_TEST_ORDER_TOKEN
if (!TOKEN) throw new Error('NUXT_TEST_ORDER_TOKEN is not set; this would email staff')

const supabase = createClient(env.NUXT_SUPABASE_URL, env.NUXT_SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false }
})
const sql = neon(env.NUXT_NEON_DATABASE_URL)

/** @param {string} table @param {string} column @param {unknown} value */
async function select(table, column, value) {
  if (BACKEND === 'neon') {
    return await sql.query(`select * from public.${table} where ${column} = $1`, [value])
  }
  const { data, error } = await supabase.from(table).select('*').eq(column, value)
  if (error) throw new Error(`${table}: ${error.message}`)
  return data
}

/** @param {string} table @param {string} column @param {unknown} value */
async function remove(table, column, value) {
  if (BACKEND === 'neon') {
    await sql.query(`delete from public.${table} where ${column} = $1`, [value])
    return
  }
  const { error } = await supabase.from(table).delete().eq(column, value)
  if (error) throw new Error(`${table}: ${error.message}`)
}

/** @param {Record<string, unknown>} patch @param {string} id */
async function setSale(patch, id) {
  if (BACKEND === 'neon') {
    await sql.query(
      'update public.store_settings set sale_active = $1, sale_percent = $2 where id = $3',
      [patch.sale_active, patch.sale_percent, id]
    )
    return
  }
  const { error } = await supabase.from('store_settings').update(patch).eq('id', id)
  if (error) throw new Error(`store_settings: ${error.message}`)
}

const settings = BACKEND === 'neon'
  ? await sql.query('select * from public.store_settings limit 1')
  : (await supabase.from('store_settings').select('*').limit(1)).data
const before = settings[0]

// A fixed sale so both runs price the same cart the same way, with the code
// beating it, which is the branch worth proving: 25 percent, not 20.
await setSale({ sale_active: true, sale_percent: 20 }, before.id)

const catalogue = await fetch(`${BASE}/api/products`).then(r => r.json())
const product = catalogue.items.find(p => p.kind === 'physical')

const email = `parity-${BACKEND}@example.com`
await remove('promo_redemptions', 'email', email)

const placed = await fetch(`${BASE}/api/orders`, {
  method: 'POST',
  headers: { 'content-type': 'application/json', 'x-test-order-token': TOKEN },
  body: JSON.stringify({
    customer: { name: 'Parity Check', email },
    items: [{ productId: product.id, quantity: 2 }],
    promoCode: 'WELCOME25'
  })
}).then(r => r.json())

if (!placed.orderId) {
  await setSale({ sale_active: before.sale_active, sale_percent: before.sale_percent }, before.id)
  throw new Error(`no order placed: ${JSON.stringify(placed)}`)
}

const order = (await select('orders', 'id', placed.orderId))[0]
const items = await select('order_items', 'order_id', placed.orderId)
const redemptions = await select('promo_redemptions', 'email', email)

console.log(`backend            ${BACKEND}`)
console.log(`product            ${product.slug}  x2`)
console.log(`subtotal_cents     ${order.subtotal_cents}`)
console.log(`discount_source    ${order.discount_source}`)
console.log(`discount_percent   ${order.discount_percent}`)
console.log(`promo_code         ${order.promo_code_snapshot}`)
console.log(`total_cents        ${order.total_cents}`)
console.log(`lines              ${items.length}`)
for (const i of items) console.log(`  unit ${i.unit_price_cents} x ${i.quantity}`)
console.log(`redemptions        ${redemptions.length}`)

await remove('promo_redemptions', 'email', email)
await remove('order_items', 'order_id', placed.orderId)
await remove('orders', 'id', placed.orderId)
await setSale({ sale_active: before.sale_active, sale_percent: before.sale_percent }, before.id)

console.log('cleaned up')
