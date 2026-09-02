<script setup lang="ts">
import type { Product } from '~/types'
import { formatMoney } from '~/utils/money'

const { data: products, error } = await useFetch<Product[]>('/api/products')
const cart = useCartStore()

/**
 * Demo listing only. These are not stored anywhere and nothing is downloadable
 * yet; the tab exists so the layout can be reviewed before the real files land.
 */
const demoFiles = [
  {
    name: 'Articulated Dragon',
    file: 'articulated-dragon.3mf',
    format: '3MF',
    size: '24.8 MB',
    icon: 'pi pi-palette',
    description:
      'Slicer project with the print settings, supports and two filament colours already set up. Open it in PrusaSlicer, Orca or Bambu Studio.'
  },
  {
    name: 'Hex Dice Tower',
    file: 'hex-dice-tower.stl',
    format: 'STL',
    size: '8.2 MB',
    icon: 'pi pi-box',
    description:
      'Plain triangle mesh, the format every desktop printer accepts. Slice it yourself and pick your own layer height and infill.'
  },
  {
    name: 'Self-Watering Planter',
    file: 'self-watering-planter.step',
    format: 'STEP',
    size: '3.1 MB',
    icon: 'pi pi-compass',
    description:
      'CAD source with exact surfaces rather than triangles. Use this one if you want to change a dimension before printing.'
  }
]

useSeoMeta({
  title: 'Shop',
  description: 'Browse the catalogue and submit an order request.'
})
</script>

<template>
  <section class="rounded-xl border border-surface-200 bg-surface-0 p-6 dark:border-surface-800 dark:bg-surface-900">
    <h1 class="mb-8 text-2xl font-semibold tracking-tight">Shop</h1>

    <Tabs value="products">
      <TabList>
        <Tab value="products" class="flex items-center gap-2">
          <i class="pi pi-box" />
          Products
        </Tab>
        <Tab value="files" class="flex items-center gap-2">
          <i class="pi pi-file" />
          Files
        </Tab>
      </TabList>

      <TabPanels>
        <TabPanel value="products" class="pt-6">
          <Message v-if="error" severity="error">
            Could not load products. Check the Supabase configuration in <code>.env</code>.
          </Message>

          <div v-else class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <article
              v-for="product in products"
              :key="product.id"
              class="flex flex-col overflow-hidden rounded-lg border border-surface-200 bg-surface-0 dark:border-surface-800 dark:bg-surface-900"
            >
              <NuxtLink :to="`/products/${product.slug}`">
                <img
                  v-if="product.image_url"
                  :src="product.image_url"
                  :alt="product.name"
                  class="aspect-square w-full object-cover"
                  loading="lazy"
                >
              </NuxtLink>

              <div class="flex flex-1 flex-col gap-2 p-4">
                <NuxtLink :to="`/products/${product.slug}`" class="font-medium hover:underline">
                  {{ product.name }}
                </NuxtLink>
                <p class="text-sm text-surface-500">{{ formatMoney(product.price_cents) }}</p>

                <Button
                  class="mt-auto"
                  :label="product.in_stock ? 'Add to cart' : 'Out of stock'"
                  :disabled="!product.in_stock"
                  size="small"
                  @click="cart.add(product.id)"
                />
              </div>
            </article>
          </div>
        </TabPanel>

        <TabPanel value="files" class="pt-6">
          <Message severity="info" class="mb-6">
            Sample listing while we set this up. Downloads are not live yet.
          </Message>

          <div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <article
              v-for="file in demoFiles"
              :key="file.file"
              class="flex flex-col gap-2 rounded-lg border border-surface-200 bg-surface-0 p-4 dark:border-surface-800 dark:bg-surface-900"
            >
              <div class="flex items-center gap-3">
                <i :class="file.icon" class="text-xl text-surface-500" />
                <div>
                  <p class="font-medium">{{ file.name }}</p>
                  <p class="text-sm text-surface-500">{{ file.format }}, {{ file.size }}</p>
                </div>
              </div>

              <p class="text-sm text-surface-600 dark:text-surface-400">{{ file.description }}</p>
              <code class="text-xs text-surface-500">{{ file.file }}</code>

              <Button class="mt-auto" label="Download" icon="pi pi-download" size="small" disabled />
            </article>
          </div>
        </TabPanel>
      </TabPanels>
    </Tabs>
  </section>
</template>
