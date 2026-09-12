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
  state: (): { mode: ColorMode; systemPrefersDark: boolean; initialised: boolean } => ({
    // Annotated on the function rather than asserted on the literal: the
    // assertion widened nothing, and the state's type is what every getter and
    // action below is checked against.
    mode: 'system',
    /** What the OS reported at load. Not tracked live; see design.md. */
    systemPrefersDark: false,
    /** Guards the client bootstrap so the watcher is only ever created once. */
    initialised: false
  }),

  getters: {
    isDark: (state): boolean =>
      state.mode === 'dark' || (state.mode === 'system' && state.systemPrefersDark),

    /**
     * The scheme actually on screen, which is not the same as `mode`: a
     * visitor on `system` is rendering one of these two. The control shows and
     * names this rather than the stored mode, because `system` is not
     * something the navbar offers.
     */
    scheme(): 'light' | 'dark' {
      return this.isDark ? 'dark' : 'light'
    },

    /** Label for the control, naming the scheme in effect and the action. */
    label(): string {
      return this.isDark ? 'Dark theme, switch to light' : 'Light theme, switch to dark'
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

    /**
     * The navbar's two-state control: switch to whichever scheme is not on
     * screen. Deriving from `isDark` rather than from `mode` is what makes a
     * visitor still on `system` behave sensibly. Under a dark OS they are
     * looking at dark, so one activation owes them light; branching on `mode`
     * would send them to `dark`, which they already had, and the click would
     * look broken.
     *
     * There is deliberately no third state here. `system` remains the default
     * for a new visitor, remains honoured by the pre-paint script, and remains
     * reachable through `set()`, but the navbar does not offer it.
     */
    toggle() {
      this.mode = this.isDark ? 'light' : 'dark'
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
    /*
     * The plugin types a serializer as taking the whole StateTree, not the
     * picked slice, so narrowing the parameter to `{ mode }` made the options
     * object stop matching and took the entire store's types down with it:
     * `defineStore` fell through to its setup-store overload and every getter
     * and action below vanished from the type. The parameter therefore takes
     * what the plugin says it is given, and the narrowing happens inside.
     */
    serializer: {
      serialize: state => (isColorMode(state.mode) ? state.mode : 'system'),
      deserialize: (value: string) => (isColorMode(value) ? { mode: value } : {})
    }
  }
})
