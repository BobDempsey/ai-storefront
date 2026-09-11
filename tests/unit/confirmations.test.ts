import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  mintConfirmation,
  outstandingConfirmations,
  spendConfirmation
} from '~~/server/utils/confirmations'

/**
 * A confirmation is the one value an assistant-drafted order needs to be
 * submitted, and it is the one value the model is never given. Everything here
 * is about the two ways that guarantee could quietly break: a token that can be
 * used twice, or a token that is accepted without having been issued.
 */

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('spendConfirmation', () => {
  it('accepts a minted confirmation exactly once', () => {
    const token = mintConfirmation()
    expect(spendConfirmation(token)).toBe(true)
    expect(spendConfirmation(token)).toBe(false)
  })

  it('leaves nothing outstanding after the spend', () => {
    const before = outstandingConfirmations()
    const token = mintConfirmation()
    expect(outstandingConfirmations()).toBe(before + 1)
    spendConfirmation(token)
    expect(outstandingConfirmations()).toBe(before)
  })

  it('refuses a value it never issued', () => {
    expect(spendConfirmation('11111111-2222-4333-8444-555555555555')).toBe(false)
    expect(spendConfirmation('')).toBe(false)
  })

  it('refuses anything that is not a string', () => {
    for (const value of [undefined, null, 42, {}, [], true]) {
      expect(spendConfirmation(value)).toBe(false)
    }
  })

  it('refuses a confirmation once its fifteen minutes are up', () => {
    const token = mintConfirmation()
    vi.advanceTimersByTime(15 * 60_000 + 1)
    expect(spendConfirmation(token)).toBe(false)
  })

  it('still accepts one just inside the window', () => {
    const token = mintConfirmation()
    vi.advanceTimersByTime(14 * 60_000)
    expect(spendConfirmation(token)).toBe(true)
  })

  it('sweeps an expired confirmation out rather than leaving it to grow', () => {
    const before = outstandingConfirmations()
    mintConfirmation()
    vi.advanceTimersByTime(15 * 60_000 + 1)
    expect(outstandingConfirmations()).toBe(before)
  })

  it('keeps confirmations separate, so spending one does not spend another', () => {
    const first = mintConfirmation()
    const second = mintConfirmation()

    expect(spendConfirmation(first)).toBe(true)
    expect(spendConfirmation(second)).toBe(true)
  })
})

describe('mintConfirmation', () => {
  it('never issues the same value twice', () => {
    const tokens = new Set(Array.from({ length: 50 }, () => mintConfirmation()))
    expect(tokens.size).toBe(50)
  })

  it('issues a uuid, which is what the order route validates against', () => {
    expect(mintConfirmation()).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
    )
  })
})
