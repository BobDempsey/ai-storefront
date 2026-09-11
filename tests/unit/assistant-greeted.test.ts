import { afterEach, describe, expect, it, vi } from 'vitest'
import { hasBeenGreeted, markGreeted } from '~/utils/assistant-greeted'

/**
 * The flag decides whether a visitor is shown the panel unasked. Both
 * functions have to survive a browser that refuses storage, and they have to
 * fail in the same direction: toward not opening. A read that answered "not
 * greeted" on a browser whose write will also fail would open the panel on
 * every page the visitor visited.
 */

const withStorage = (store: Storage | undefined) => vi.stubGlobal('localStorage', store)

afterEach(() => {
  vi.unstubAllGlobals()
})

const fakeStorage = () => {
  const values = new Map<string, string>()
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => void values.set(key, value)
  } as unknown as Storage
}

const throwingStorage = () =>
  ({
    getItem() {
      throw new DOMException('denied')
    },
    setItem() {
      throw new DOMException('denied')
    }
  }) as unknown as Storage

describe('hasBeenGreeted', () => {
  it('is false for a browser that has never been greeted', () => {
    withStorage(fakeStorage())

    expect(hasBeenGreeted()).toBe(false)
  })

  it('is true once the flag has been written', () => {
    withStorage(fakeStorage())

    markGreeted()

    expect(hasBeenGreeted()).toBe(true)
  })

  it('is true when storage throws, because that browser cannot be written to either', () => {
    withStorage(throwingStorage())

    expect(hasBeenGreeted()).toBe(true)
  })

  it('is true when there is no storage at all', () => {
    withStorage(undefined)

    expect(hasBeenGreeted()).toBe(true)
  })
})

describe('markGreeted', () => {
  it('does not throw when storage refuses the write', () => {
    withStorage(throwingStorage())

    expect(() => markGreeted()).not.toThrow()
  })

  it('does not throw when there is no storage at all', () => {
    withStorage(undefined)

    expect(() => markGreeted()).not.toThrow()
  })
})
