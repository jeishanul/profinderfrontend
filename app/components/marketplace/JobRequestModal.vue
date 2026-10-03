<script setup lang="ts">
// Auto-imported as <MarketplaceJobRequestModal/>. A structured booking
// request to one provider: what you need, when, and where. It starts (or
// reopens) the conversation with the request as its first message, so the
// provider can answer with a quote carrying a real date, time and price —
// accepting that quote is what creates the booking.
const props = defineProps<{
  open: boolean
  providerId: string
  providerName: string
  /** The provider's active listings; the client can say which one they want. */
  services?: { id: string, title: string }[]
  /** Pre-selects a service (e.g. from a per-service "Request this" button). */
  serviceId?: string | null
  /** Pre-fills the address (e.g. "Book again" reuses the earlier job's). */
  initialAddress?: string | null
}>()

const emit = defineEmits<{
  close: []
}>()

const { t } = useI18n()
const localePath = useLocalePath()
const toast = useToast()
const titleId = useId()

const description = ref('')
const preferredDate = ref('')
const preferredTime = ref('')
const address = ref('')
const serviceListingId = ref('')
const errors = ref<Record<string, string>>({})
const isSubmitting = ref(false)
// The server refused because the email isn't verified: offer to fix that right here.
const needsEmailVerification = ref(false)
const verification = useEmailVerification()

const VISIBLE_FIELDS = new Set(['description', 'preferredDate', 'preferredTime', 'address', 'serviceListingId'])
const hasServices = computed(() => (props.services?.length ?? 0) > 0)

const today = computed(() => toDateTimeLocalValue(new Date()).slice(0, 10))

// `immediate`: callers may mount this already open (e.g. "Book again").
watch(() => props.open, (isOpen) => {
  if (!isOpen) return
  description.value = ''
  preferredDate.value = ''
  preferredTime.value = ''
  address.value = props.initialAddress ?? ''
  serviceListingId.value = props.serviceId ?? ''
  errors.value = {}
}, { immediate: true })

async function submit() {
  errors.value = {}
  if (!description.value.trim()) {
    errors.value = { description: t('marketplace.jobRequest.errors.description') }
    return
  }
  if (preferredTime.value && !preferredDate.value) {
    errors.value = { preferredDate: t('marketplace.jobRequest.errors.dateForTime') }
    return
  }

  isSubmitting.value = true
  try {
    const conversation = await useApiFetch<{ id: string }>('/api/dashboard/conversations', {
      method: 'POST',
      body: {
        providerId: Number(props.providerId),
        request: {
          description: description.value.trim(),
          serviceListingId: serviceListingId.value ? Number(serviceListingId.value) : null,
          preferredDate: preferredDate.value || null,
          preferredTime: preferredTime.value || null,
          address: address.value.trim() || null,
        },
      },
    })
    emit('close')
    toast.success(t('marketplace.jobRequest.sent', { name: props.providerName }))
    await navigateTo(localePath({ path: '/messages', query: { conversation: conversation.id } }))
  }
  catch (error) {
    if (isEmailUnverifiedError(error)) {
      needsEmailVerification.value = true
      errors.value = { form: apiErrorMessage(error, t('marketplace.jobRequest.errors.submit')) }
      return
    }
    needsEmailVerification.value = false
    const fieldErrors = apiFieldErrors(error)
    // Laravel nests these as `request.description`; show them against the matching field.
    const mapped = Object.fromEntries(Object.entries(fieldErrors).map(([key, message]) => [key.replace(/^request\./, ''), message]))
    // Anything with no input on screen (an unknown key, or a service the form isn't offering) must still be said somewhere.
    const orphans = Object.entries(mapped).filter(([key]) => !VISIBLE_FIELDS.has(key) || (key === 'serviceListingId' && !hasServices.value))
    errors.value = Object.fromEntries(Object.entries(mapped).filter(entry => !orphans.includes(entry)))
    if (orphans.length > 0) errors.value.form = orphans[0]![1]
    if (Object.keys(errors.value).length === 0) errors.value = { form: apiErrorMessage(error, t('marketplace.jobRequest.errors.submit')) }
  }
  finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <UiModal
    :open="open"
    :labelledby="titleId"
    @close="emit('close')"
  >
    <h2
      :id="titleId"
      class="mb-1.5 font-display text-xl font-bold"
    >
      {{ t('marketplace.jobRequest.title', { name: providerName }) }}
    </h2>
    <p class="mb-5 text-sm text-black/60 dark:text-white/60">
      {{ t('marketplace.jobRequest.subtitle', { name: providerName }) }}
    </p>

    <form
      class="flex max-h-[70vh] flex-col gap-4 overflow-y-auto pr-1"
      @submit.prevent="submit"
    >
      <div v-if="services && services.length > 0">
        <label
          for="jr-service"
          class="mb-1.5 block text-xs font-bold"
        >{{ t('marketplace.jobRequest.service') }}</label>
        <select
          id="jr-service"
          v-model="serviceListingId"
          class="w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm text-black outline-none focus:border-brand-500 dark:border-white/10 dark:bg-white/5 dark:text-white"
        >
          <option value="">
            {{ t('marketplace.jobRequest.serviceAny') }}
          </option>
          <option
            v-for="service in services"
            :key="service.id"
            :value="service.id"
          >
            {{ service.title }}
          </option>
        </select>
        <p
          v-if="errors.serviceListingId"
          class="mt-1.5 text-xs text-red-600 dark:text-red-400"
        >
          {{ errors.serviceListingId }}
        </p>
      </div>

      <div>
        <label
          for="jr-description"
          class="mb-1.5 block text-xs font-bold"
        >{{ t('marketplace.jobRequest.description') }}</label>
        <textarea
          id="jr-description"
          v-model="description"
          rows="4"
          maxlength="2000"
          :placeholder="t('marketplace.jobRequest.descriptionPlaceholder')"
          class="w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm text-black outline-none focus:border-brand-500 dark:border-white/10 dark:bg-white/5 dark:text-white"
        />
        <p
          v-if="errors.description"
          class="mt-1.5 text-xs text-red-600 dark:text-red-400"
        >
          {{ errors.description }}
        </p>
      </div>

      <div class="grid grid-cols-2 gap-4">
        <div>
          <label
            for="jr-date"
            class="mb-1.5 block text-xs font-bold"
          >{{ t('marketplace.jobRequest.date') }}</label>
          <input
            id="jr-date"
            v-model="preferredDate"
            type="date"
            :min="today"
            class="w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm text-black outline-none focus:border-brand-500 dark:border-white/10 dark:bg-white/5 dark:text-white"
          >
          <p
            v-if="errors.preferredDate"
            class="mt-1.5 text-xs text-red-600 dark:text-red-400"
          >
            {{ errors.preferredDate }}
          </p>
        </div>
        <div>
          <label
            for="jr-time"
            class="mb-1.5 block text-xs font-bold"
          >{{ t('marketplace.jobRequest.time') }}</label>
          <input
            id="jr-time"
            v-model="preferredTime"
            type="time"
            class="w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm text-black outline-none focus:border-brand-500 dark:border-white/10 dark:bg-white/5 dark:text-white"
          >
          <p
            v-if="errors.preferredTime"
            class="mt-1.5 text-xs text-red-600 dark:text-red-400"
          >
            {{ errors.preferredTime }}
          </p>
        </div>
      </div>

      <div>
        <label
          for="jr-address"
          class="mb-1.5 block text-xs font-bold"
        >{{ t('marketplace.jobRequest.address') }}</label>
        <UiInput
          id="jr-address"
          v-model="address"
          icon="map-pin"
          maxlength="255"
          :placeholder="t('marketplace.jobRequest.addressPlaceholder')"
        />
        <p
          v-if="errors.address"
          class="mt-1.5 text-xs text-red-600 dark:text-red-400"
        >
          {{ errors.address }}
        </p>
      </div>

      <p
        v-if="errors.form"
        role="alert"
        class="text-sm font-semibold text-red-600 dark:text-red-400"
      >
        {{ errors.form }}
      </p>
      <UiButton
        v-if="needsEmailVerification"
        type="button"
        variant="secondary"
        :disabled="verification.isStarting.value"
        @click="verification.start(() => submit())"
      >
        {{ t('marketplace.jobRequest.verifyEmail') }}
      </UiButton>

      <div class="mt-1 flex justify-end gap-2.5">
        <UiButton
          type="button"
          variant="ghost"
          @click="emit('close')"
        >
          {{ t('marketplace.jobRequest.cancel') }}
        </UiButton>
        <UiButton
          type="submit"
          variant="primary"
          :disabled="isSubmitting"
        >
          {{ t('marketplace.jobRequest.submit') }}
        </UiButton>
      </div>
    </form>
  </UiModal>
</template>
