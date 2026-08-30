<script setup lang="ts">
const cart = useCartStore()
const { storeName } = useRuntimeConfig().public
</script>

<template>
  <div class="min-h-screen flex flex-col bg-surface-50 text-surface-900">
    <header class="border-b border-surface-200 bg-white">
      <nav class="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
        <NuxtLink to="/" class="text-lg font-semibold tracking-tight">{{ storeName }}</NuxtLink>

        <NuxtLink to="/cart" class="relative inline-flex items-center gap-2 text-sm">
          <i class="pi pi-shopping-cart" />
          <span>Cart</span>
          <ClientOnly>
            <Badge v-if="cart.count" :value="cart.count" severity="contrast" />
          </ClientOnly>
        </NuxtLink>
      </nav>
    </header>

    <main class="mx-auto w-full max-w-5xl flex-1 px-4 py-10">
      <slot />
    </main>

    <footer class="border-t border-surface-200 px-4 py-6 text-center text-xs text-surface-500">
      Orders are confirmed by email — payment is arranged separately.
    </footer>
  </div>
</template>
