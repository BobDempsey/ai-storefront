<script setup lang="ts">
import { messageFor } from '~/utils/errors'
const form = reactive({ name: '', email: '', message: '', subscribe: false })

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

      <p class="text-surface-600 dark:text-surface-400">
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
