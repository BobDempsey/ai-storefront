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
      storeName: 'Store'
    }
  }
})
