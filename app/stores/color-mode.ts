import { defineStore } from 'pinia'

export type ColorMode = 'light' | 'dark' | 'system'

const MODES: ColorMode[] = ['light', 'dark', 'system']

/**
 * Storage key. Must stay in sync with the inline head script in
 * nuxt.config.ts, which reads the same key before first paint. The value is a
 * bare string, not JSON, so the script does not have to know about
 * pinia-plugin-persistedstate's envelope.
 */
const STORAGE_KEY = 'color-mode'

const isColorMode = (value: unknown): value is ColorMode =>
  MODES.includes(value as ColorMode)

/**
 * Single source of truth for the colour scheme. The `.dark` class on <html> is
 * written here and nowhere else. Components call actions, they never touch
 * the DOM.
 */
export const useColorModeStore = defineStore('color-mode', {
  state: () => ({
    mode: 'system' as ColorMode,
    /** What the OS reported at load. Not tracked live; see design.md. */
    systemPrefersDark: false,
    /** Guards the client bootstrap so the watcher is only ever created once. */
    initialised: false
  }),

  getters: {
    isDark: (state): boolean =>
      state.mode === 'dark' || (state.mode === 'system' && state.systemPrefersDark),

    /** Label for the control, describing the mode currently in effect. */
    label(): string {
      if (this.mode === 'system') return 'Theme: system'
      return this.mode === 'dark' ? 'Theme: dark' : 'Theme: light'
    }
  },

  actions: {
    /**
     * Client-only bootstrap: read the OS preference, then keep <html> in step
     * with `isDark` for the life of the app.
     */
    init() {
      if (import.meta.server || this.initialised) return
      this.initialised = true

      this.systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches

      watch(
        () => this.isDark,
        dark => document.documentElement.classList.toggle('dark', dark),
        { immediate: true }
      )
    },

    set(mode: ColorMode) {
      if (isColorMode(mode)) this.mode = mode
    },

    /** light → dark → system → light */
    cycle() {
      this.mode = MODES[(MODES.indexOf(this.mode) + 1) % MODES.length]!
    }
  },

  persist: {
    key: STORAGE_KEY,
    /*
     * Explicit: the pinia-plugin-persistedstate Nuxt module defaults to
     * cookies, which would send the preference to the server on every request
     * and leave the pre-paint script (which reads localStorage) unable to see
     * it.
     */
    storage: piniaPluginPersistedstate.localStorage(),
    pick: ['mode'],
    serializer: {
      serialize: (state: { mode: ColorMode }) => state.mode,
      deserialize: (value: string) => (isColorMode(value) ? { mode: value } : {})
    }
  }
})
