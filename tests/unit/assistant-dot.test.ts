import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useAssistantStore } from '~/stores/assistant'

/**
 * The dot points at a panel the visitor has not opened yet, and it is the only
 * thing that does: nothing opens the panel on their behalf. It is deliberately
 * not stored anywhere. The store is rebuilt on every page load, so "shows
 * again on a refresh" falls out of the default rather than out of an expiry
 * rule, and the tests below pin that default as much as the clearing.
 */

beforeEach(() => {
  setActivePinia(createPinia())
  vi.stubGlobal('$fetch', vi.fn().mockResolvedValue({ available: true }))
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('the dot on a fresh page load', () => {
  it('shows, because a rebuilt store is what a refresh produces', () => {
    const store = useAssistantStore()

    expect(store.showDot).toBe(true)
  })

  it('shows again after a refresh, even once the panel has been opened', async () => {
    const first = useAssistantStore()
    await first.openDrawer()
    expect(first.showDot).toBe(false)

    // A refresh rebuilds the store. Nothing was written anywhere, so there is
    // nothing to remember that the panel was opened.
    setActivePinia(createPinia())
    const afterRefresh = useAssistantStore()

    expect(afterRefresh.showDot).toBe(true)
  })
})

describe('openDrawer', () => {
  it('clears the dot', async () => {
    const store = useAssistantStore()

    await store.openDrawer()

    expect(store.open).toBe(true)
    expect(store.showDot).toBe(false)
  })

  it('clears the dot even when the assistant turns out to be unavailable', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockResolvedValue({ available: false }))
    const store = useAssistantStore()

    await store.openDrawer()

    // The visitor asked for the panel and got it, so the cue has done its job
    // whatever the panel then reports.
    expect(store.open).toBe(true)
    expect(store.showDot).toBe(false)
  })

  it('leaves the dot cleared after the visitor closes the panel again', async () => {
    const store = useAssistantStore()
    await store.openDrawer()

    store.close()

    // Closing is not a reason to start pointing at it again; they have seen it.
    expect(store.showDot).toBe(false)
  })

  it('starts no conversation, and asks the server only whether it is available', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ available: true })
    vi.stubGlobal('$fetch', fetchMock)
    const store = useAssistantStore()

    await store.openDrawer()

    expect(store.messages).toEqual([])
    expect(store.isEmpty).toBe(true)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledWith('/api/chat')
  })
})

describe('what can open the panel', () => {
  it('exposes no action that opens the panel for the visitor', () => {
    const store = useAssistantStore()

    // Pins the "only the visitor opens the panel" requirement. The first-visit
    // auto-open was removed in favour of the dot; reintroducing one has to be
    // a deliberate edit here, not a quiet addition to the store.
    expect(store).not.toHaveProperty('autoOpenOnce')
  })

  it('starts closed', () => {
    const store = useAssistantStore()

    expect(store.open).toBe(false)
  })
})
