<script setup lang="ts">
const cart = useCartStore()
const colorMode = useColorModeStore()
const assistant = useAssistantStore()
const { storeName, siteUrl } = useRuntimeConfig().public

// Names the discount in the footer's opt-in invitation, so the copy tracks the
// active code rather than a number written into the page.
const { optinOffer } = useStoreSettings()

// Client-only; starts the watcher that owns the `.dark` class on <html>.
colorMode.init()

// The tab title. It lives here rather than in `nuxt.config.ts` because
// `storeName` is a runtime value: a titleTemplate in the config would bake in
// whatever NUXT_PUBLIC_STORE_NAME held at build time, so the second shop would
// ship the first shop's name. A page that sets no title of its own gets the
// store name alone.
useHead({
  titleTemplate: title => (title ? `${title} · ${storeName}` : storeName)
})

// Defaults for every page's link preview. A page that sets its own title or
// description through useSeoMeta wins, because its call runs after this one;
// the product page overrides the image too. Omitting ogImage when siteUrl is
// unset is deliberate: a relative path is silently dropped by every consumer,
// which looks like working tags that never show a picture.
useSeoMeta({
  ogSiteName: storeName,
  ogType: 'website',
  ogTitle: () => `${storeName} — handmade 3D prints and printable files`,
  ogDescription: 'Browse the catalogue and submit an order request.',
  ogImage: siteUrl ? `${siteUrl}/og-image.png` : undefined,
  ogImageWidth: siteUrl ? 1200 : undefined,
  ogImageHeight: siteUrl ? 630 : undefined,
  ogImageAlt: siteUrl ? `${storeName}` : undefined,
  twitterCard: 'summary_large_image'
})

// Two icons, never three: the control switches between light and dark, so it
// shows the scheme on screen rather than the stored mode. A visitor still on
// `system` sees the one they are actually looking at.
const themeIcon = computed(() => (colorMode.isDark ? 'pi pi-moon' : 'pi pi-sun'))
</script>

<template>
  <div class="min-h-screen flex flex-col bg-surface-100 text-surface-900 dark:bg-surface-950 dark:text-surface-0">
    <header class="sticky top-0 z-50 border-b border-surface-200 bg-surface-0 dark:border-surface-800 dark:bg-surface-900">
      <nav class="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
        <NuxtLink to="/" class="text-lg font-semibold tracking-tight">{{ storeName }}</NuxtLink>

        <div class="flex items-center gap-4">
          <ClientOnly>
            <button
              type="button"
              class="relative inline-flex size-8 items-center justify-center rounded-full text-sm transition-colors hover:bg-surface-200 dark:hover:bg-surface-700"
              aria-label="Open the shop assistant"
              title="Shop assistant"
              @click="assistant.openDrawer()"
            >
              <i class="pi pi-microchip-ai" />
              <!--
                Points at a panel the visitor has not opened yet on this page
                load. Unlike the cart badge below it carries no value and gets
                no sr-only companion: it says "look here", which the button's
                own aria-label already covers, so announcing it would be noise.
              -->
              <span
                v-if="assistant.showDot"
                aria-hidden="true"
                class="assistant-dot absolute -right-0.5 -top-0.5 size-2.5 rounded-full bg-emerald-500 ring-2 ring-surface-0 dark:bg-emerald-400 dark:ring-surface-900"
              />
            </button>
            <template #fallback>
              <span class="size-8" />
            </template>
          </ClientOnly>

          <NuxtLink
            to="/contact"
            class="inline-flex size-8 items-center justify-center rounded-full text-sm transition-colors hover:bg-surface-200 dark:hover:bg-surface-700"
            aria-label="Contact us"
            title="Contact us"
          >
            <i class="pi pi-envelope" />
          </NuxtLink>

          <ClientOnly>
            <button
              type="button"
              class="inline-flex size-8 items-center justify-center rounded-full text-sm transition-colors hover:bg-surface-200 dark:hover:bg-surface-700"
              :aria-label="`Change theme (currently ${colorMode.scheme})`"
              :title="colorMode.label"
              @click="colorMode.toggle()"
            >
              <i :class="themeIcon" />
            </button>
            <template #fallback>
              <span class="size-8" />
            </template>
          </ClientOnly>

          <NuxtLink
            to="/cart"
            class="relative inline-flex size-8 items-center justify-center rounded-full text-sm transition-colors hover:bg-surface-200 dark:hover:bg-surface-700"
            aria-label="Cart"
          >
            <i class="pi pi-shopping-cart" />
            <ClientOnly>
              <Badge
                v-if="cart.count"
                :value="cart.count"
                severity="contrast"
                size="small"
                class="absolute -right-1 -top-1"
              />
              <!-- The badge is decorative markup, so state the count for screen readers. -->
              <span v-if="cart.count" class="sr-only">{{ cart.count }} items</span>
            </ClientOnly>
          </NuxtLink>
        </div>
      </nav>
    </header>

    <main class="mx-auto w-full max-w-5xl flex-1 px-4 py-10">
      <slot />
    </main>

    <ClientOnly>
      <AssistantDrawer />
    </ClientOnly>

    <footer class="border-t border-surface-200 px-4 py-6 text-center text-xs text-surface-500 dark:border-surface-800 dark:text-surface-400">
      <p class="mb-4">Orders are confirmed by email. Payment is arranged separately.</p>
      <div class="mx-auto max-w-xs">
        <p class="mb-2 font-medium text-surface-700 dark:text-surface-300">
          <span v-if="optinOffer">Get updates and {{ optinOffer }}</span>
          <span v-else>Get updates from the shop</span>
        </p>
        <EmailOptinForm />
      </div>
    </footer>
  </div>
</template>

<style scoped>
/*
 * The attention dot's pulse. A local keyframes rule rather than Tailwind's
 * animate-pulse, which fades opacity to 0.5 and back: that reads as a fade, and
 * this wants a ring that grows and clears.
 */
.assistant-dot::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 9999px;
  background-color: inherit;
  animation: assistant-dot-pulse 2s ease-out infinite;
}

@keyframes assistant-dot-pulse {
  0% {
    transform: scale(1);
    opacity: 0.7;
  }
  70%,
  100% {
    transform: scale(2.2);
    opacity: 0;
  }
}

/*
 * Motion off, dot still there. Hiding it would take the cue away from exactly
 * the visitors most likely to have reduced motion set for accessibility
 * reasons; the dot itself carries the meaning and the animation only draws the
 * eye to it.
 */
@media (prefers-reduced-motion: reduce) {
  .assistant-dot::after {
    animation: none;
    display: none;
  }
}
</style>
