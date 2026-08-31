import tailwindcss from '@tailwindcss/vite'
import Aura from '@primeuix/themes/aura'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  modules: [
    '@primevue/nuxt-module',
    '@pinia/nuxt',
    'pinia-plugin-persistedstate/nuxt'
  ],

  css: ['~/assets/css/main.css', 'primeicons/primeicons.css'],

  app: {
    head: {
      script: [
        {
          // Runs synchronously in <head>, before first paint, so a returning
          // dark-mode visitor never sees a flash of the light theme. A Nuxt
          // plugin would be too late. The 'color-mode' key and its bare-string
          // value must match STORAGE_KEY in app/stores/color-mode.ts.
          innerHTML:
            "try{var m=localStorage.getItem('color-mode');" +
            "if(m==='dark'||((!m||m==='system')&&matchMedia('(prefers-color-scheme: dark)').matches))" +
            "document.documentElement.classList.add('dark')}catch(e){}",
          tagPosition: 'head'
        }
      ]
    }
  },

  vite: {
    plugins: [tailwindcss()]
  },

  primevue: {
    options: {
      theme: {
        preset: Aura,
        options: {
          darkModeSelector: '.dark',
          cssLayer: { name: 'primevue', order: 'theme, base, primevue' }
        }
      }
    }
  },

  // Server-only secrets. Override with NUXT_* env vars.
  runtimeConfig: {
    supabaseUrl: '',
    supabaseServiceKey: '',
    resendApiKey: '',
    orderFromEmail: 'onboarding@resend.dev',
    orderAdminEmail: '',
    public: {
      storeName: 'Store',
      // Rendered into the page as a mailto link, so public by design.
      contactEmail: ''
    }
  }
})
