import tailwindcss from '@tailwindcss/vite'
import Aura from '@primeuix/themes/aura'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',

  typescript: {
    tsConfig: { compilerOptions: { noUncheckedIndexedAccess: true } }
  },
  devtools: { enabled: true },

  modules: [
    '@primevue/nuxt-module',
    '@pinia/nuxt',
    'pinia-plugin-persistedstate/nuxt',
    '@nuxt/image'
  ],

  // Product photographs are 800x800 files committed to public/images/, and the
  // catalogue renders them at three sizes: 36px in the search panel, 64px in
  // the cart and a full card on the shop page. Serving the 800px original for
  // a 36px thumbnail is most of a megabyte of the catalogue page wasted.
  //
  // The IPX provider resizes on the server at request time and caches the
  // result, so no build step and no external image host is involved, which
  // keeps the promise in section 1 of handoff.md that the catalogue has
  // neither. `screens` matches the Tailwind breakpoints the grid already uses.
  image: {
    quality: 80,
    format: ['webp', 'jpeg'],
    screens: { sm: 640, md: 768, lg: 1024, xl: 1280 }
  },

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
        },
        // Vercel Web Analytics page views, production builds only: Vercel
        // serves /_vercel/insights/script.js, and it 404s anywhere else. The
        // @vercel/analytics package is not used because npm cannot resolve its
        // optional @sveltejs/kit peer against this project's Vite.
        ...(process.env.NODE_ENV === 'production'
          ? [
              {
                innerHTML:
                  'window.va = window.va || function () { (window.vaq = window.vaq || []).push(arguments); };'
              },
              { src: '/_vercel/insights/script.js', defer: true }
            ]
          : [])
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
    // Which Postgres this deployment reads and writes: 'supabase' or 'neon'.
    // Named rather than sniffed from the shape of a connection string, because
    // guessing is how a shop ends up on the wrong database with nothing in the
    // logs saying so. Two shops run this same build against different hosts.
    databaseBackend: 'supabase',
    supabaseUrl: '',
    supabaseServiceKey: '',
    // Postgres connection string for the 'neon' backend. A credential, so it
    // is server-only and must never take the NUXT_PUBLIC_ prefix.
    neonDatabaseUrl: '',
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
      siteUrl: '',
      // Path to this shop's share image, under `public/`, leading slash and
      // no origin. Empty means no image rather than a default one: two shops
      // run this same build, and a preview showing the other shop's name is
      // worse than a preview showing no picture at all.
      ogImage: '',
      // Which deployment this is: 'development', 'preview', or anything else
      // you want named on screen. Empty means the live shop and renders nothing,
      // so a deployment that was never told about this behaves as it always
      // has. 'production' means the same. A dev server falls back to
      // 'development' on its own; a Vercel preview cannot, because its build
      // looks exactly like production, so set it there by hand.
      deployEnv: ''
    }
  }
})
