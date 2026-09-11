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

  routeRules: {
    '/**': { headers: { 'Cache-Control': 'no-store' } }
  },

  vite: {
    plugins: [tailwindcss()],
    server: {
      // Vite refuses requests whose Host header it does not know, which blocks
      // sharing the dev server through a Cloudflare quick tunnel.
      allowedHosts: ['.trycloudflare.com']
    }
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
    openaiApiKey: '',
    orderFromEmail: 'onboarding@resend.dev',
    orderAdminEmail: '',
    // Empty by default, which is what makes an unconfigured server unable to
    // create a test order at all.
    testOrderToken: '',
    // Which header the rate limiter may believe about who is calling. The
    // default is Vercel's, because that is where this deploys; a proxy on top
    // of Vercel can overwrite x-forwarded-for but not this one. Set it to your
    // own proxy's header, or empty to use the connection address alone.
    trustedIpHeader: 'x-vercel-forwarded-for',
    public: {
      storeName: 'Store',
      // Absolute origin, no trailing slash. Open Graph consumers refuse a
      // relative image path, so the share tags have to build a full URL and
      // nothing in a request tells a prerendered page what its own origin is.
      // Empty means the share image is omitted rather than emitted broken.
      siteUrl: ''
    }
  }
})
