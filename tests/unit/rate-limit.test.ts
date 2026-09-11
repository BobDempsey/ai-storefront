import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { rateLimit } from '~~/server/utils/rate-limit'

// The limiter keeps its window in a module-level Map keyed by the string the
// caller passes, so every test uses a key of its own rather than trying to
// reset shared state.
let counter = 0
const freshKey = (prefix = 'ip') => `${prefix}:${Date.now()}:${counter++}`

const spend = (key: string, times: number, limit = 3, windowMs = 60_000) => {
  for (let i = 0; i < times; i++) rateLimit(key, limit, windowMs)
}

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('rateLimit', () => {
  it('allows calls up to the limit', () => {
    const key = freshKey()
    expect(() => spend(key, 3)).not.toThrow()
  })

  it('throws a 429 on the call past the limit', () => {
    const key = freshKey()
    spend(key, 3)
    try {
      rateLimit(key, 3, 60_000)
      throw new Error('expected the limiter to throw')
    } catch (err) {
      expect((err as { statusCode?: number }).statusCode).toBe(429)
    }
  })

  it('carries the caller-supplied message', () => {
    const key = freshKey()
    spend(key, 1, 1)
    try {
      rateLimit(key, 1, 60_000, 'Too many orders. Please try again later.')
      throw new Error('expected the limiter to throw')
    } catch (err) {
      expect((err as { statusMessage?: string }).statusMessage).toBe(
        'Too many orders. Please try again later.'
      )
    }
  })

  it('uses a default message when none is given', () => {
    const key = freshKey()
    spend(key, 1, 1)
    try {
      rateLimit(key, 1, 60_000)
      throw new Error('expected the limiter to throw')
    } catch (err) {
      expect((err as { statusMessage?: string }).statusMessage).toBe(
        'Too many requests. Please try again later.'
      )
    }
  })

  it('keeps each key to its own allowance', () => {
    const a = freshKey()
    const b = freshKey()
    spend(a, 3)
    expect(() => rateLimit(a, 3, 60_000)).toThrow()
    expect(() => rateLimit(b, 3, 60_000)).not.toThrow()
  })

  // The assistant spends a `chat:` bucket while orders spend a bare IP key. A
  // visitor who exhausts one must still be able to use the other.
  it('isolates the chat bucket from the order bucket for one visitor', () => {
    const ip = `1.2.3.${counter++}`
    spend(ip, 5, 5, 10 * 60_000)
    expect(() => rateLimit(ip, 5, 10 * 60_000)).toThrow()
    expect(() => rateLimit(`chat:${ip}`, 75, 24 * 60 * 60_000)).not.toThrow()
  })

  // Sliding, not fixed: the allowance comes back as each hit ages out, rather
  // than all at once on a boundary.
  it('lets a caller through again once their oldest hit ages out', () => {
    const key = freshKey()
    rateLimit(key, 2, 60_000)
    vi.advanceTimersByTime(30_000)
    rateLimit(key, 2, 60_000)
    expect(() => rateLimit(key, 2, 60_000)).toThrow()

    // 31s later the first hit is 61s old and has left the window; the second,
    // at 31s, has not.
    vi.advanceTimersByTime(31_000)
    expect(() => rateLimit(key, 2, 60_000)).not.toThrow()
    expect(() => rateLimit(key, 2, 60_000)).toThrow()
  })

  it('restores the whole allowance once the window has fully passed', () => {
    const key = freshKey()
    spend(key, 3)
    expect(() => rateLimit(key, 3, 60_000)).toThrow()
    vi.advanceTimersByTime(60_001)
    expect(() => spend(key, 3)).not.toThrow()
  })

  it('does not count a rejected call against the caller', () => {
    const key = freshKey()
    spend(key, 2, 2)
    expect(() => rateLimit(key, 2, 60_000)).toThrow()
    // Still exactly two hits on record, so one ageing out frees exactly one slot.
    vi.advanceTimersByTime(60_001)
    expect(() => spend(key, 2, 2)).not.toThrow()
  })
})

/**
 * The isolation test above is only meaningful while the chat route actually
 * prefixes its key. Reading the source is blunt, but it is what catches someone
 * dropping the prefix and silently putting the assistant on the order budget.
 */
describe('the buckets the routes actually use', () => {
  const source = (path: string) =>
    readFileSync(fileURLToPath(new URL(`../../server/api/${path}`, import.meta.url)), 'utf8')

  it('keys the assistant on a chat: prefix', () => {
    expect(source('chat.post.ts')).toContain('`chat:${getRequestIP(')
  })

  it('keys orders on the bare address, so the two cannot collide', () => {
    const orders = source('orders.post.ts')
    expect(orders).toContain("getRequestIP(event, { xForwardedFor: true }) ?? 'unknown'")
    expect(orders).not.toContain('chat:')
  })
})
