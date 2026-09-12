import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { useSearchPaletteStore } from '~/stores/search-palette'

/**
 * The panel's open state. Small, but it is what the navbar control and the
 * Ctrl+K shortcut both write to, and a panel that reopened itself on a page
 * load would be a panel nobody asked for, so "starts closed" is worth pinning.
 */
describe('the search palette store', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('starts closed', () => {
    expect(useSearchPaletteStore().open).toBe(false)
  })

  it('opens and closes', () => {
    const palette = useSearchPaletteStore()
    palette.openPalette()
    expect(palette.open).toBe(true)
    palette.close()
    expect(palette.open).toBe(false)
  })

  it('toggles, which is what the keyboard shortcut calls', () => {
    const palette = useSearchPaletteStore()
    palette.toggle()
    expect(palette.open).toBe(true)
    palette.toggle()
    expect(palette.open).toBe(false)
  })
})
