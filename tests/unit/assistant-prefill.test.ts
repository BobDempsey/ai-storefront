import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useAssistantStore } from '~/stores/assistant'

/**
 * A product page opens the panel with a question about that product already
 * written. The store's whole part in that is carrying the text from the page to
 * the drawer, so what is pinned here is the handover and its edges: an open
 * with no question must not clear one already waiting, and taking the question
 * must leave the rest of the store alone.
 *
 * What the drawer does with the text, and the three conditions it checks before
 * using it, are the drawer's own and are covered end to end rather than here.
 */

const QUESTION = 'Can you tell me about the Hex Dice Tower?'

beforeEach(() => {
  setActivePinia(createPinia())
  vi.stubGlobal('$fetch', vi.fn().mockResolvedValue({ available: true }))
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('opening the panel with a question', () => {
  it('leaves the question waiting for the drawer', async () => {
    const store = useAssistantStore()

    await store.openDrawer(QUESTION)

    expect(store.open).toBe(true)
    expect(store.prefill).toBe(QUESTION)
  })

  it('starts with nothing waiting', () => {
    expect(useAssistantStore().prefill).toBe('')
  })

  it('still clears the dot and still asks whether the assistant is available', async () => {
    const store = useAssistantStore()

    await store.openDrawer(QUESTION)

    expect(store.showDot).toBe(false)
    expect(store.available).toBe(true)
    expect($fetch).toHaveBeenCalledWith('/api/chat')
  })

  it('reports the assistant unavailable when the check fails, question or no question', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockRejectedValue(new Error('offline')))
    const store = useAssistantStore()

    await store.openDrawer(QUESTION)

    expect(store.available).toBe(false)
    // The question still stands: the panel says it is unavailable, and the
    // visitor's own text is not thrown away on its behalf.
    expect(store.prefill).toBe(QUESTION)
  })
})

describe('opening the panel with no question', () => {
  it('does not disturb one already waiting', async () => {
    const store = useAssistantStore()
    await store.openDrawer(QUESTION)
    store.close()

    await store.openDrawer()

    expect(store.prefill).toBe(QUESTION)
  })

  it('leaves nothing waiting when nothing ever was', async () => {
    const store = useAssistantStore()

    await store.openDrawer()

    expect(store.prefill).toBe('')
  })
})

describe('taking the question', () => {
  it('empties it, so a later open does not bring it back', async () => {
    const store = useAssistantStore()
    await store.openDrawer(QUESTION)

    store.takePrefill()
    store.close()
    await store.openDrawer()

    expect(store.prefill).toBe('')
  })

  it('touches nothing else', async () => {
    const store = useAssistantStore()
    await store.openDrawer(QUESTION)
    store.messages.push({ role: 'user', content: 'hello' })

    store.takePrefill()

    expect(store.open).toBe(true)
    expect(store.showDot).toBe(false)
    expect(store.messages).toHaveLength(1)
  })
})
