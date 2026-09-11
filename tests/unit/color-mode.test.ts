import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { useColorModeStore } from '~/stores/color-mode'

/**
 * The navbar control is two-state, but the store still holds three modes, and
 * `system` is the default every new visitor starts on. That gap is the whole
 * risk here: a toggle that branches on the stored mode sends a visitor on
 * `system` to the scheme they are already looking at, and the click does
 * nothing visible. So each case below pins what one activation does to the
 * scheme on screen, not to the value in storage.
 */

beforeEach(() => {
  setActivePinia(createPinia())
})

describe('toggle', () => {
  it('switches an explicit light to dark', () => {
    const store = useColorModeStore()
    store.set('light')

    store.toggle()

    expect(store.mode).toBe('dark')
    expect(store.isDark).toBe(true)
  })

  it('switches an explicit dark to light', () => {
    const store = useColorModeStore()
    store.set('dark')

    store.toggle()

    expect(store.mode).toBe('light')
    expect(store.isDark).toBe(false)
  })

  it('sends a system visitor under a dark OS to light', () => {
    const store = useColorModeStore()
    store.systemPrefersDark = true

    expect(store.mode).toBe('system')
    expect(store.isDark).toBe(true)

    store.toggle()

    expect(store.mode).toBe('light')
    expect(store.isDark).toBe(false)
  })

  it('sends a system visitor under a light OS to dark', () => {
    const store = useColorModeStore()
    store.systemPrefersDark = false

    expect(store.mode).toBe('system')
    expect(store.isDark).toBe(false)

    store.toggle()

    expect(store.mode).toBe('dark')
    expect(store.isDark).toBe(true)
  })

  it('never reaches a third state, however many times it is activated', () => {
    const store = useColorModeStore()
    store.set('light')

    for (let i = 0; i < 6; i++) store.toggle()

    expect(store.mode).toBe('light')
  })
})

describe('set', () => {
  it('still accepts system, so the mode stays reachable in code', () => {
    const store = useColorModeStore()
    store.set('dark')

    store.set('system')

    expect(store.mode).toBe('system')
  })

  it('ignores a value that is not a colour mode', () => {
    const store = useColorModeStore()
    store.set('light')

    store.set('sepia' as never)

    expect(store.mode).toBe('light')
  })
})

describe('scheme and label', () => {
  it('name the scheme on screen, not the stored mode', () => {
    const store = useColorModeStore()
    store.systemPrefersDark = true

    expect(store.mode).toBe('system')
    expect(store.scheme).toBe('dark')
    expect(store.label).toBe('Dark theme, switch to light')
    expect(store.label).not.toContain('system')
  })

  it('name light for a system visitor under a light OS', () => {
    const store = useColorModeStore()
    store.systemPrefersDark = false

    expect(store.scheme).toBe('light')
    expect(store.label).toBe('Light theme, switch to dark')
  })
})
