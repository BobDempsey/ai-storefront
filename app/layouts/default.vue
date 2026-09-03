<script setup lang="ts">
const cart = useCartStore()
const colorMode = useColorModeStore()
const assistant = useAssistantStore()
const { storeName } = useRuntimeConfig().public

// Names the discount in the footer's opt-in invitation, so the copy tracks the
// active code rather than a number written into the page.
const { optinOffer } = useStoreSettings()

// Client-only; starts the watcher that owns the `.dark` class on <html>.
colorMode.init()

const themeIcon = computed(() => {
  if (colorMode.mode === 'system') return 'pi pi-desktop'
  return colorMode.mode === 'dark' ? 'pi pi-moon' : 'pi pi-sun'
})
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
              class="inline-flex size-8 items-center justify-center rounded-full text-sm transition-colors hover:bg-surface-200 dark:hover:bg-surface-700"
              aria-label="Open the shop assistant"
              title="Shop assistant"
              @click="assistant.openDrawer()"
            >
              <i class="pi pi-comments" />
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
              :aria-label="`Change theme (currently ${colorMode.mode})`"
              :title="colorMode.label"
              @click="colorMode.cycle()"
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
