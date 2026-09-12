import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

/**
 * These tests run against the live Supabase project, by decision: there is no
 * throwaway project and no local Postgres. Every order they create is marked
 * `is_test`, which is what keeps them out of a staff member's view of real
 * business and out of the notification email.
 */

/** Reads .env directly. Vitest runs outside Nitro, so runtimeConfig is absent. */
function env(): Record<string, string> {
  const path = fileURLToPath(new URL('../../.env', import.meta.url))
  const out: Record<string, string> = {}
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const match = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim())
    // Both groups exist whenever the pattern matched; the compiler cannot
    // see that through a RegExpExecArray.
    if (match) out[match[1]!] = match[2]!.replace(/^"|"$/g, '')
  }
  return out
}

const values = env()

export const TEST_ORDER_TOKEN = values.NUXT_TEST_ORDER_TOKEN ?? ''
export const BASE_URL = process.env.TEST_BASE_URL ?? 'http://localhost:3000'

let client: SupabaseClient | null = null

export function db(): SupabaseClient {
  if (client) return client
  const url = values.NUXT_SUPABASE_URL
  const key = values.NUXT_SUPABASE_SERVICE_KEY
  if (!url || !key) {
    throw new Error('NUXT_SUPABASE_URL and NUXT_SUPABASE_SERVICE_KEY must be set in .env')
  }
  client = createClient(url, key, { auth: { persistSession: false } })
  return client
}

/**
 * Deletes stray test orders left by a run that crashed before its teardown.
 * Only rows marked `is_test`, and only ones older than an hour, so a run
 * happening alongside this one is never touched.
 */
export async function sweepStaleTestOrders() {
  const cutoff = new Date(Date.now() - 60 * 60_000).toISOString()
  const { data, error } = await db()
    .from('orders')
    .delete()
    .eq('is_test', true)
    .lt('created_at', cutoff)
    .select('id')
  if (error) throw new Error(`sweep failed: ${error.message}`)
  return data?.length ?? 0
}

/**
 * order_items and promo_redemptions both cascade on orders.id, so deleting the
 * order is enough to take the whole record with it.
 */
export async function deleteOrders(ids: string[]) {
  if (!ids.length) return
  const { error } = await db().from('orders').delete().in('id', ids)
  if (error) throw new Error(`teardown failed: ${error.message}`)
}

/** A fresh address per call, so promo-redemption uniqueness never collides. */
export function uniqueEmail(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.invalid`
}
