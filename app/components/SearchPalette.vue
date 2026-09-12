<script setup lang="ts">
import type { CataloguePage, Product } from '~/types'
import { formatMoney } from '~/utils/money'

/**
 * The quick search panel behind the navbar's magnifier.
 *
 * It opens over whatever page the visitor is on, lists the catalogue before a
 * key is pressed, and narrows as they type. Listing up front is the point: a
 * panel that opens empty asks the visitor to guess what the shop stocks, and
 * this one answers that question with the first frame.
 *
 * It searches through the same route the catalogue page uses, so the panel and
 * the page cannot disagree about what a word matches.
 */

const search = useSearchPaletteStore()
const router = useRouter()

// Seeded at creation rather than watched into place. The layout renders this
// component with `v-if="palette.open"`, so it does not exist until the panel is
// already open and a watcher on that flag would never see it turn true. Both
// refs are set, not just `typed`, because letting the debounce below catch up
// would list the whole catalogue for 200ms before narrowing.
const typed = ref(search.seed)
const term = ref(search.seed.trim())
const highlighted = ref(0)

// The URL the field writes to is a request, not history: this panel is
// transient, so the term lives here and only a deliberate "see all" puts it in
// the address.
let pending: ReturnType<typeof setTimeout> | undefined
watch(typed, value => {
  clearTimeout(pending)
  pending = setTimeout(() => {
    term.value = value.trim()
  }, 200)
})
onBeforeUnmount(() => clearTimeout(pending))

// The panel asks for one page of eight and shows what comes back. It does not
// page: a visitor who wants the rest takes the term to the catalogue page
// through the row below, which is the thing that pages.
const LIMIT = 8

const { data, status } = await useFetch<CataloguePage>('/api/products', {
  query: { q: term, perPage: LIMIT },
  // The panel is client-only, so there is nothing to prefetch on the server.
  server: false,
  // Keeps the previous answer on screen while the next one is in flight, so
  // the list does not blink empty between keystrokes.
  keepalive: true,
  // A whole page, not a stub: the shared CataloguePage type is what caught
  // this one, since the panel's own copy of the shape had no page fields.
  default: (): CataloguePage => ({ items: [], total: 0, page: 1, perPage: LIMIT })
})

const results = computed(() => data.value?.items ?? [])
// What the catalogue page would show beyond this panel, which is why the row
// below can say how many more there are without fetching them.
const overflow = computed(() => Math.max((data.value?.total ?? 0) - results.value.length, 0))
const loading = computed(() => status.value === 'pending')
const empty = computed(() => !loading.value && results.value.length === 0)

// The rows the arrow keys move through: every result, then the "see all" row,
// which is offered when there is a term to carry or more items than fit.
const seeAllRow = computed(() => (term.value || overflow.value ? 1 : 0))
const rowCount = computed(() => results.value.length + seeAllRow.value)

watch([results, seeAllRow], () => {
  highlighted.value = 0
})

function move(delta: number) {
  if (!rowCount.value) return
  highlighted.value = (highlighted.value + delta + rowCount.value) % rowCount.value
}

function close() {
  search.close()
  typed.value = ''
  term.value = ''
  highlighted.value = 0
}

function open(product: Product) {
  close()
  void router.push(`/products/${product.slug}`)
}

function seeAll() {
  // `typed`, not `term`: the debounce below holds `term` back by 200ms, so a
  // visitor who types and clicks straight through would be sent to an
  // unsearched catalogue. What they can see in the field is what they get.
  const q = typed.value.trim()
  close()
  void router.push(q ? { path: '/', query: { q } } : '/')
}

function choose() {
  const product = results.value[highlighted.value]
  if (product) open(product)
  else if (typed.value.trim()) seeAll()
}
</script>

<template>
  <!--
    A Dialog rather than a Drawer: the assistant already owns the side panel,
    and a palette that slides in from the same edge reads as the same thing.
    `dismissableMask` and Escape both close it, which is what a visitor who
    opened it by accident tries first.
  -->
  <Dialog
    v-model:visible="search.open"
    modal
    dismissable-mask
    :show-header="false"
    class="w-[min(34rem,92vw)]"
    :pt="{ content: { class: '!p-0' } }"
    aria-label="Search the shop"
    @hide="close"
  >
    <div class="border-b border-surface-200 dark:border-surface-800">
      <IconField>
        <InputIcon class="pi pi-search" />
        <InputText
          id="palette-search"
          v-model="typed"
          class="w-full !border-0 !bg-transparent !shadow-none"
          placeholder="Search the shop"
          aria-label="Search the shop"
          autocomplete="off"
          autofocus
          @keydown.down.prevent="move(1)"
          @keydown.up.prevent="move(-1)"
          @keydown.enter.prevent="choose"
          @keydown.esc="close"
        />
      </IconField>
    </div>

    <!--
      role="listbox" with one active descendant, rather than focusable rows: the
      field keeps focus the whole time, which is what lets a visitor keep typing
      while the highlight moves.
    -->
    <ul
      class="max-h-80 overflow-y-auto py-1"
      role="listbox"
      aria-label="Search results"
      data-testid="palette-results"
    >
      <li v-if="empty" class="px-4 py-6 text-center text-sm text-surface-500">
        Nothing in the catalogue matches "{{ term }}".
      </li>

      <li
        v-for="(product, index) in results"
        :key="product.id"
        role="option"
        :aria-selected="index === highlighted"
        :class="[
          'flex cursor-pointer items-center gap-3 px-4 py-2.5 text-sm',
          index === highlighted ? 'bg-surface-100 dark:bg-surface-800' : ''
        ]"
        @mouseenter="highlighted = index"
        @click="open(product)"
      >
        <NuxtImg
          v-if="product.image_url"
          :src="product.image_url"
          alt=""
          :width="36"
          :height="36"
          class="size-9 rounded object-cover"
          loading="lazy"
        />
        <i v-else class="pi pi-file size-9 content-center text-center text-surface-500" />

        <span class="min-w-0 flex-1 truncate">{{ product.name }}</span>

        <span class="shrink-0 text-surface-500">{{ formatMoney(product.price_cents) }}</span>
      </li>

      <li
        v-if="term || overflow"
        role="option"
        :aria-selected="highlighted === results.length"
        :class="[
          'flex cursor-pointer items-center gap-2 border-t border-surface-200 px-4 py-2.5 text-sm dark:border-surface-800',
          highlighted === results.length ? 'bg-surface-100 dark:bg-surface-800' : ''
        ]"
        data-testid="palette-see-all"
        @mouseenter="highlighted = results.length"
        @click="seeAll"
      >
        <i class="pi pi-arrow-right text-xs" />
        <span v-if="term">
          Search the shop for "{{ term }}"
          <template v-if="overflow">({{ overflow }} more)</template>
        </span>
        <span v-else>Browse all {{ data?.total ?? 0 }} items</span>
      </li>
    </ul>

    <p class="border-t border-surface-200 px-4 py-2 text-xs text-surface-500 dark:border-surface-800">
      Arrow keys to move, Enter to open, Esc to close.
    </p>
  </Dialog>
</template>
