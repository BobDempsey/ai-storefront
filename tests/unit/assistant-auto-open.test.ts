import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useAssistantStore } from '~/stores/assistant'

/**
 * The panel opens itself once per browser, and every branch below is a way
 * that "once" could turn into "every page". The flag not being written is the
 * dangerous direction: a visitor who is shown the panel on every navigation
 * has a worse shop than one who is never shown it at all.
 */

let greeted = false
let markCalls = 0
const fetchMock = vi.fn()

beforeEach(() => {
  setActivePinia(createPinia())
  greeted = false
  markCalls = 0
  fetchMock.mockReset()

  vi.stubGlobal('hasBeenGreeted', () => greeted)
  vi.stubGlobal('markGreeted', () => {
    markCalls++
    greeted = true
  })
  vi.stubGlobal('$fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('autoOpenOnce', () => {
  it('opens the panel and records it on a first visit', async () => {
    fetchMock.mockResolvedValue({ available: true })
    const store = useAssistantStore()

    await store.autoOpenOnce()

    expect(store.open).toBe(true)
    expect(markCalls).toBe(1)
  })

  it('does nothing on a later visit, and asks the server nothing', async () => {
    greeted = true
    const store = useAssistantStore()

    await store.autoOpenOnce()

    expect(store.open).toBe(false)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('stays closed when the assistant is not configured', async () => {
    fetchMock.mockResolvedValue({ available: false })
    const store = useAssistantStore()

    await store.autoOpenOnce()

    expect(store.open).toBe(false)
  })

  it('spends no greeting on an unconfigured shop, so a later visit still gets one', async () => {
    fetchMock.mockResolvedValue({ available: false })
    const store = useAssistantStore()

    await store.autoOpenOnce()

    expect(markCalls).toBe(0)
    expect(greeted).toBe(false)
  })

  it('stays closed when the availability check fails', async () => {
    fetchMock.mockRejectedValue(new Error('offline'))
    const store = useAssistantStore()

    await store.autoOpenOnce()

    expect(store.open).toBe(false)
    expect(markCalls).toBe(0)
  })

  it('stays closed when the browser will not say whether it has greeted', async () => {
    // hasBeenGreeted answers true when storage throws, because a browser that
    // cannot be read cannot be written either.
    greeted = true
    const store = useAssistantStore()

    await store.autoOpenOnce()

    expect(store.open).toBe(false)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('leaves a panel the visitor already opened alone', async () => {
    const store = useAssistantStore()
    store.open = true

    await store.autoOpenOnce()

    expect(fetchMock).not.toHaveBeenCalled()
    expect(markCalls).toBe(0)
  })

  it('opens at most once even if mounted twice', async () => {
    fetchMock.mockResolvedValue({ available: true })
    const store = useAssistantStore()

    await store.autoOpenOnce()
    store.close()
    await store.autoOpenOnce()

    expect(store.open).toBe(false)
    expect(markCalls).toBe(1)
  })

  it('starts no conversation', async () => {
    fetchMock.mockResolvedValue({ available: true })
    const store = useAssistantStore()

    await store.autoOpenOnce()

    expect(store.messages).toEqual([])
    expect(store.isEmpty).toBe(true)
    // The only request made was the free availability GET, with no body.
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledWith('/api/chat')
  })
})
