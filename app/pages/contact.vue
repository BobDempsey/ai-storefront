<script setup lang="ts">
import { messageFor } from '~/utils/errors'
const form = reactive({
  name: '',
  email: '',
  message: '',
  subscribe: false,
  kind: 'question' as 'question' | 'custom-order'
})

/**
 * A visitor sent here by a search the catalogue could not answer arrives with
 * the term waiting in the store, and the form opens with it already written.
 *
 * Taken in `onMounted` rather than in setup: the store is only ever filled by a
 * click on another page, so the server can never hold a term, and reading it
 * after the page has mounted keeps the first client render identical to the
 * one the server sent. It is a plain message with a marker on it, not a second
 * kind of form: the fields, the validation and the route are the same ones an
 * ordinary question uses.
 */
const customOrder = useCustomOrderStore()
onMounted(() => {
  const term = customOrder.takeTerm()
  if (!term) return
  form.kind = 'custom-order'
  form.message = `I'm looking for: ${term}`
})

// Names the discount on the opt-in label, so it tracks the active code.
const { optinOffer } = useStoreSettings()
const submitting = ref(false)
const sent = ref(false)
const errorMessage = ref('')

async function submitMessage() {
  errorMessage.value = ''
  submitting.value = true

  try {
    await $fetch('/api/contact', { method: 'POST', body: form })
    // Nothing is stored, so the confirmation is shown only for a send the
    // server actually acknowledged.
    sent.value = true
  } catch (error: unknown) {
    errorMessage.value = messageFor(error, 'Something went wrong. Please try again.')
  } finally {
    submitting.value = false
  }
}

useSeoMeta({
  title: 'Contact us',
  description: 'Send us a question about a product or an order.'
})
</script>

<template>
  <section class="mx-auto max-w-xl">
    <h1 class="mb-8 text-2xl font-semibold tracking-tight">Contact us</h1>

    <div v-if="sent" class="rounded-lg border border-surface-200 bg-surface-0 p-6 dark:border-surface-800 dark:bg-surface-900">
      <i class="pi pi-check-circle mb-3 block text-3xl text-green-600" />
      <h2 class="mb-2 text-lg font-medium">Message sent</h2>
      <p class="text-surface-600 dark:text-surface-400">
        We have your message and will reply to {{ form.email }}.
      </p>
      <Button class="mt-6" label="Continue shopping" outlined @click="navigateTo('/')" />
    </div>

    <form v-else class="flex flex-col gap-5" @submit.prevent="submitMessage">
      <Message v-if="errorMessage" severity="error">{{ errorMessage }}</Message>

      <!--
        The custom-request wording is deliberately short of a promise. The shop
        has not seen the request yet, so the page cannot say it can be made or
        what it would cost, and staff answer both questions in their reply.
      -->
      <p v-if="form.kind === 'custom-order'" data-testid="custom-order-note" class="text-surface-600 dark:text-surface-400">
        Tell us what you're after and we'll reply by email with whether we can
        make it and what it would cost. Sending this orders nothing.
      </p>

      <p v-else class="text-surface-600 dark:text-surface-400">
        Ask us about a product or an order. We reply by email.
      </p>

      <div class="flex flex-col gap-2">
        <label for="name">Name</label>
        <InputText id="name" v-model="form.name" required maxlength="120" autocomplete="name" />
      </div>

      <div class="flex flex-col gap-2">
        <label for="email">Email</label>
        <InputText id="email" v-model="form.email" type="email" required maxlength="200" autocomplete="email" />
      </div>

      <div class="flex flex-col gap-2">
        <label for="message">Message</label>
        <Textarea id="message" v-model="form.message" required maxlength="4000" rows="6" auto-resize />
      </div>

      <div class="flex items-start gap-2">
        <Checkbox v-model="form.subscribe" input-id="contact-subscribe" binary />
        <label for="contact-subscribe" class="text-sm text-surface-600 dark:text-surface-400">
          <span v-if="optinOffer">Email me updates and {{ optinOffer }}</span>
          <span v-else>Email me updates from the shop</span>
        </label>
      </div>

      <Button type="submit" label="Send message" :loading="submitting" class="self-start" />
    </form>
  </section>
</template>
