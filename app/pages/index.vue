<script setup lang="ts">
import type { CataloguePage, DigitalProduct, Product } from '~/types'
import { formatBytes } from '~/utils/bytes'

const route = useRoute()
const router = useRouter()
const cart = useCartStore()
const assistant = useAssistantStore()
const { storeName } = useRuntimeConfig().public

// The URL is the search, and everything else reads from it: the field, the
// fetch, a reload and a shared link all end up at the same place, with no
// second copy of the term to keep in step.
const term = computed(() => {
  const q = route.query.q
  return (Array.isArray(q) ? q[0] : q)?.trim() ?? ''
})

// What the visitor has typed, which runs ahead of the URL by the debounce
// below so the field never waits on a request.
const typed = ref(term.value)
watch(term, value => {
  if (value !== typed.value.trim()) typed.value = value
})

// Which page each tab is on, one-based, because the number is shown to a
// person. Two numbers rather than one: the tabs hold different counts, so a
// shared number would put one of them past its end whenever the other paged on.
const page = computed(() => pageFrom(route.query.page))
const filePage = computed(() => pageFrom(route.query.filePage))

function pageFrom(value: unknown) {
  const n = Number(Array.isArray(value) ? value[0] : value)
  return Number.isInteger(n) && n > 0 ? n : 1
}

/** The address as it should read, with first pages and an empty term left out
 *  of it, so an unsearched, unpaged catalogue keeps the plain `/` it has. */
function addressFor(next: { q?: string; page?: number; filePage?: number }) {
  const query: Record<string, string> = {}
  const q = next.q ?? term.value
  const p = next.page ?? page.value
  const fp = next.filePage ?? filePage.value
  if (q) query.q = q
  if (p > 1) query.page = String(p)
  if (fp > 1) query.filePage = String(fp)
  return { query }
}

// `replace`, not `push`: ten keystrokes must not become ten history entries,
// or Back walks the visitor through their own typing one letter at a time.
// Paging below uses `push`, because a page change is a deliberate step Back
// should undo.
let pending: ReturnType<typeof setTimeout> | undefined
watch(typed, value => {
  clearTimeout(pending)
  pending = setTimeout(() => {
    const next = value.trim()
    if (next === term.value) return
    // Both pages reset in the same write: page four of the old results says
    // nothing about the new ones, and a separate watcher would flash the old
    // page and leave a useless history entry behind.
    void router.replace(addressFor({ q: next, page: 1, filePage: 1 }))
  }, 250)
})
onBeforeUnmount(() => clearTimeout(pending))

/** PrimeVue's Paginator counts from zero and reports rows offsets. */
function goToPage(kind: 'page' | 'filePage', event: { page: number }) {
  void router.push(addressFor({ [kind]: event.page + 1 }))
}

const palette = useSearchPaletteStore()

const searchInput = useTemplateRef<{ $el: HTMLElement } | HTMLInputElement>('searchInput')
function inputEl() {
  const el = searchInput.value
  return el instanceof HTMLInputElement ? el : (el?.$el as HTMLInputElement | undefined)
}

/**
 * The field's whole job. Focus is handed straight back off it, because leaving
 * it focused behind an open dialog means Escape closes the panel onto a field
 * that looks ready to type into and is not.
 */
function openPanel() {
  if (palette.open) return
  palette.openPalette(typed.value)
  inputEl()?.blur()
}

function clearSearch() {
  typed.value = ''
}

const customOrder = useCustomOrderStore()

/**
 * The other way out of an empty search: ask staff instead of leaving. The shop
 * takes custom print requests, and until now the catalogue's only answer to a
 * term it did not stock was to offer the visitor their own search back.
 *
 * The term travels in the store rather than in the address, the way the product
 * page hands a question to the assistant, so the contact form starts filled
 * without `/contact` becoming a link that carries the visitor's search around
 * (see app/stores/custom-order.ts). Nothing is sent here, and no price is
 * quoted: the form is where they write the request and they send it themselves.
 */
function askAboutThis() {
  customOrder.askFor(term.value)
  void navigateTo('/contact')
}

// One request per tab, each keyed on the term and on that tab's own page, so
// the two page independently. Filtering and paging both happen in the database:
// a client-side filter could only search the rows the page already holds.
const { data: productPage, error } = await useFetch<CataloguePage<Product>>('/api/products', {
  query: { q: term, page, kind: 'physical' },
  // The list keeps what it has while the next answer is in flight, so typing
  // does not flash an empty catalogue between keystrokes.
  keepalive: true
})

const { data: filePage_, error: fileError } = await useFetch<CataloguePage<DigitalProduct>>(
  '/api/products',
  {
    query: { q: term, page: filePage, kind: 'digital' },
    keepalive: true
  }
)

// What the assistant can actually do, in the visitor's terms. Each line maps to
// a tool in server/utils/assistant.ts: get_product, then search_catalogue,
// then draft_order, then propose_cart_change. Keep them in step. The sentence
// under the list is the boundary
// the prompt enforces, and saying it up front is cheaper than a visitor
// spending one of their 25 messages finding it out.
const CAN_DO = [
  'Answer product sizing and price',
  'Ask if we sell something for a particular job',
  'Draft an order for you to check and confirm yourself',
  'Add items to your cart (with your approval)'
]

const physical = computed(() => productPage.value?.items ?? [])
const files = computed(() => filePage_.value?.items ?? [])

// The totals, not the rendered lengths: a visitor on page one of twelve items
// should be told there are twelve, not six.
const physicalTotal = computed(() => productPage.value?.total ?? 0)
const filesTotal = computed(() => filePage_.value?.total ?? 0)
const perPage = computed(() => productPage.value?.perPage ?? 6)

const searching = computed(() => term.value.length > 0)
const nothingMatched = computed(
  () => searching.value && !physicalTotal.value && !filesTotal.value
)

// Icon classes are presentation, so the format maps to one here rather than
// tying the catalogue to PrimeVue's icon set.
const FORMAT_ICONS: Record<string, string> = {
  '3MF': 'pi pi-palette',
  STL: 'pi pi-box',
  STEP: 'pi pi-sliders-h',
  OBJ: 'pi pi-box',
  ZIP: 'pi pi-folder'
}
const iconFor = (format: string) => FORMAT_ICONS[format.toUpperCase()] ?? 'pi pi-file'

useSeoMeta({
  title: 'Shop',
  description: 'Browse the catalogue and submit an order request.'
})
</script>

<template>
  <!--
    The introduction. It names the assistant before the visitor meets the dot on
    the navbar, because a chat panel on a shop is worth explaining rather than
    discovering. Every claim here is written against the tool list rather than
    the marketing of it, including the one about what it cannot do: the model is
    never given a way to place an order or to touch a promo code, and a visitor
    who knows that reads a refusal as the design rather than a failure.

    Nothing here is specific to this shop. It renders `storeName` and describes
    the assistant, both of which the second deployment has too, so this section
    does not have to be edited or hidden when the same code runs another store.
  -->
  <section class="mb-6 rounded-xl border border-surface-200 bg-surface-0 p-4 sm:p-6 dark:border-surface-800 dark:bg-surface-900">
    <h1 class="text-2xl font-semibold tracking-tight">{{ storeName }}</h1>

    <div class="mt-3 flex max-w-3xl flex-col gap-3 text-surface-600 dark:text-surface-400">
      <p>
        An AI-assisted shop for desk organisers, planters, lamps, gaming gear
        and other 3D-printed goods.
      </p>

      <p>Find finished products or the files to print your own items.</p>

      <p>
        You can place an order by asking the AI shop assistant for help, or add
        items to your cart and complete the check out form. We'll be in touch by
        email after you submit an order. No payments are currently taken on the
        website.
      </p>
    </div>

    <div class="mt-6 rounded-lg border border-surface-200 bg-surface-50 p-4 sm:p-5 dark:border-surface-800 dark:bg-surface-950">
      <h2 class="flex items-center gap-2 font-medium">
        <i class="pi pi-microchip-ai text-primary" />
        Shop by asking the AI shop assistant
      </h2>

      <p class="mt-2 max-w-2xl text-sm text-surface-600 dark:text-surface-400">
        There is an AI shop assistant on this site that knows the catalogue and
        your cart. Ask it questions about a product, or tell it what you're
        looking for and it will help you find it.
      </p>

      <ul class="mt-4 grid gap-2 sm:grid-cols-2">
        <li
          v-for="item in CAN_DO"
          :key="item"
          class="flex items-start gap-2 text-sm text-surface-600 dark:text-surface-400"
        >
          <i class="pi pi-check mt-1 text-xs text-primary" />
          <span>{{ item }}</span>
        </li>
      </ul>

      <p class="mt-4 max-w-2xl text-sm text-surface-500">
        The AI shop assistant cannot place an order for you or take payment,
        but it can draft an order up for you to approve. Once you approve,
        it'll send us the order and you'll get an email confirmation.
      </p>

      <Button
        class="mt-5"
        label="Ask the AI Shop Assistant"
        icon="pi pi-microchip-ai"
        size="small"
        @click="assistant.openDrawer()"
      />
    </div>
  </section>

  <!--
    Three layers of horizontal padding stack up between the viewport and a
    product card: this section, PrimeVue's own .p-tabpanels, and the layout's
    px-4 on <main>. At 390px that left 118px of the screen as padding and the
    cards too narrow. The two inner layers drop away below sm; the layout's
    16px page gutter stays, because that one is the margin of the page itself.
  -->
  <section class="rounded-xl border border-surface-200 bg-surface-0 p-4 sm:p-6 dark:border-surface-800 dark:bg-surface-900">
    <!--
      Demoted from h1: the introduction above owns the page's heading now. The
      search field sits beside it and wraps under it on a narrow screen, where
      a heading and a field cannot share a line legibly.
    -->
    <div class="mb-8 flex flex-wrap items-center justify-between gap-4">
      <h2 class="text-2xl font-semibold tracking-tight">Shop</h2>

      <IconField class="w-full sm:w-72">
        <InputIcon class="pi pi-search" />
        <!--
          A launcher rather than a second search box. Clicking or tabbing to it
          opens the quick search panel, carrying whatever term the page is
          already filtered by, so the visitor continues instead of starting
          again. readonly is what stops a keystroke landing here while the panel
          is open, which would split one term across two boxes; the field still
          shows the active term so a shared link can be read back.
        -->
        <InputText
          id="catalogue-search"
          ref="searchInput"
          :model-value="typed"
          class="w-full cursor-pointer placeholder:text-sm"
          type="search"
          readonly
          placeholder="Search the shop (Ctrl+K)"
          aria-label="Search the shop"
          autocomplete="off"
          @focus="openPanel"
          @click="openPanel"
        />
        <!--
          A clear control rather than only the term: selecting the text first to
          delete it is the thing a visitor should not have to do. Hidden when
          the box is empty, where it would clear nothing.
        -->
        <InputIcon
          v-if="typed"
          class="pi pi-times cursor-pointer"
          role="button"
          tabindex="0"
          aria-label="Clear the search"
          @click="clearSearch"
          @keydown.enter="clearSearch"
          @keydown.space.prevent="clearSearch"
        />
      </IconField>
    </div>

    <!--
      One message for a search that found nothing anywhere, naming what was
      searched for: a visitor who mistyped needs to see the term back, and the
      two per-tab notes below would otherwise be the only answer and would read
      as the shop being empty.
    -->
    <Message v-if="nothingMatched && !error" severity="secondary" class="mb-6">
      Nothing in the catalogue matches "{{ term }}".
      <button type="button" class="underline" @click="clearSearch">Clear the search</button>
      to see everything, or
      <button type="button" class="underline" data-testid="ask-about-this" @click="askAboutThis">
        ask us about it
      </button>
      and we'll reply by email.
    </Message>

    <!--
      show-navigators is off because leaving it on is a hydration mismatch, not
      a style choice. PrimeVue's TabList starts with isNextButtonEnabled true
      and only corrects it in updateButtonState(), which measures the rendered
      list and so cannot run on the server. So SSR ships a scroll arrow the
      client removes on mount, and the browser logs "Hydration completed but
      contains mismatches" on every page load. Two short labels never overflow
      anything, so the arrows had nothing to do here either way.
    -->
    <Tabs value="products" :show-navigators="false">
      <TabList>
        <Tab value="products" class="flex items-center gap-2">
          <i class="pi pi-box" />
          Products
          <!--
            Each tab says how many of its own items matched, so a visitor
            reading one tab can see the other holds results without opening it.
          -->
          <Badge v-if="searching" :value="physicalTotal" severity="secondary" />
        </Tab>
        <Tab value="files" class="flex items-center gap-2">
          <i class="pi pi-file" />
          Files
          <Badge v-if="searching" :value="filesTotal" severity="secondary" />
        </Tab>
      </TabList>

      <TabPanels class="!px-0 sm:!px-[18px]">
        <TabPanel value="products" class="pt-6">
          <Message v-if="error" severity="error">
            Could not load products. Check the Supabase configuration in <code>.env</code>.
          </Message>

          <p v-else-if="searching && !physicalTotal" class="text-sm text-surface-500">
            No products match "{{ term }}".
          </p>

          <div v-else class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <article
              v-for="product in physical"
              :key="product.id"
              class="flex flex-col overflow-hidden rounded-lg border border-surface-200 bg-surface-0 dark:border-surface-800 dark:bg-surface-900"
            >
              <NuxtLink :to="`/products/${product.slug}`">
                <!--
                  width/height are the intrinsic size the file is stored at, so
                  IPX has an aspect ratio to reserve and the card does not jump
                  when the photo lands. sizes names how wide the card actually
                  is at each breakpoint, which is what lets a phone fetch a
                  400px file instead of the 800px original.
                -->
                <NuxtImg
                  v-if="product.image_url"
                  :src="product.image_url"
                  :alt="product.name"
                  :width="800"
                  :height="800"
                  sizes="100vw sm:50vw lg:33vw"
                  class="aspect-square w-full object-cover"
                  loading="lazy"
                />
              </NuxtLink>

              <div class="flex flex-1 flex-col gap-2 p-4">
                <NuxtLink :to="`/products/${product.slug}`" class="font-medium hover:underline">
                  {{ product.name }}
                </NuxtLink>
                <p class="text-sm text-surface-500">
                  <SalePrice
                    :price-cents="product.price_cents"
                    :original-price-cents="product.originalPriceCents"
                    :sale-percent="product.salePercent"
                  />
                </p>

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

          <!--
            PrimeVue's own control rather than a hand-rolled one: it already
            collapses to arrows and a current page at phone width, which is the
            case this has to survive, and the theme applies to it unchanged.
            Hidden entirely while everything fits on one page.
          -->
          <Paginator
            v-if="!error && physicalTotal > perPage"
            :rows="perPage"
            :total-records="physicalTotal"
            :first="(page - 1) * perPage"
            class="mt-6"
            data-testid="products-paginator"
            @page="goToPage('page', $event)"
          />
        </TabPanel>

        <TabPanel value="files" class="pt-6">
          <Message v-if="fileError" severity="error">
            Could not load files. Check the Supabase configuration in <code>.env</code>.
          </Message>

          <p v-else-if="searching && !filesTotal" class="text-sm text-surface-500">
            No files match "{{ term }}".
          </p>

          <p v-else-if="!filesTotal" class="text-sm text-surface-500">
            No files are listed yet.
          </p>

          <div v-else class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <article
              v-for="file in files"
              :key="file.id"
              class="flex flex-col gap-2 rounded-lg border border-surface-200 bg-surface-0 p-4 dark:border-surface-800 dark:bg-surface-900"
            >
              <div class="flex items-center gap-3">
                <i :class="iconFor(file.file_format)" class="text-xl text-surface-500" />
                <div>
                  <NuxtLink :to="`/products/${file.slug}`" class="font-medium hover:underline">
                    {{ file.name }}
                  </NuxtLink>
                  <p class="text-sm text-surface-500">
                    {{ file.file_format }}, {{ formatBytes(file.file_size_bytes) }}
                  </p>
                </div>
              </div>

              <p class="text-sm text-surface-600 dark:text-surface-400">{{ file.description }}</p>
              <code class="text-xs text-surface-500">{{ file.file_name }}</code>
              <p class="text-sm font-medium">
                <SalePrice
                  :price-cents="file.price_cents"
                  :original-price-cents="file.originalPriceCents"
                  :sale-percent="file.salePercent"
                />
              </p>
              <p class="text-xs text-surface-500">Emailed to you once payment is arranged.</p>

              <Button
                class="mt-auto"
                :label="cart.quantityOf(file.id) ? 'In cart' : 'Add to cart'"
                :disabled="Boolean(cart.quantityOf(file.id))"
                size="small"
                @click="cart.add(file.id, 1, { single: true })"
              />
            </article>
          </div>

          <Paginator
            v-if="!fileError && filesTotal > perPage"
            :rows="perPage"
            :total-records="filesTotal"
            :first="(filePage - 1) * perPage"
            class="mt-6"
            data-testid="files-paginator"
            @page="goToPage('filePage', $event)"
          />
        </TabPanel>

      </TabPanels>
    </Tabs>
  </section>
</template>

<style scoped>
/*
  The browser draws its own clear control inside a `type="search"` box, so the
  field showed two crosses side by side. The one that stays is ours: it is the
  one the tests drive, it carries a label, and it is reachable by keyboard.
  `type="search"` itself is kept for the semantics and for Escape-to-clear.
*/
:deep(input[type='search'])::-webkit-search-cancel-button,
:deep(input[type='search'])::-webkit-search-decoration {
  appearance: none;
}
</style>
