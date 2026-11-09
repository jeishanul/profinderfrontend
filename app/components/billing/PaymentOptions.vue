<script setup lang="ts">
import type { Invoice } from '#shared/types/billing'

// Auto-imported as <BillingPaymentOptions/>. How an unpaid invoice can be paid: the gateways the server offers for it.
// PayPal sends the browser to PayPal (it comes back to `/billing/invoices/{number}/paypal-return`); a manual gateway
// (bank transfer…) shows its instructions and takes the transfer's reference plus an optional receipt, after which
// the invoice waits for an admin to confirm it. Never cash.
const props = defineProps<{
  invoice: Invoice
}>()

const emit = defineEmits<{
  updated: [invoice: Invoice]
}>()

const { t } = useI18n()
const toast = useToast()

const number = computed(() => encodeURIComponent(props.invoice.number))
const selectedKey = ref(props.invoice.gateways[0]?.key ?? '')
const selected = computed(() => props.invoice.gateways.find(gateway => gateway.key === selectedKey.value) ?? null)

const busy = ref(false)

async function payWithPaypal() {
  busy.value = true
  try {
    const { approveUrl } = await useApiFetch<{ approveUrl: string }>(`/api/dashboard/billing/invoices/${number.value}/paypal`, { method: 'POST' })
    window.location.href = approveUrl
  }
  catch (error) {
    toast.error(apiErrorMessage(error, t('billing.pay.payStartFailed')))
    busy.value = false
  }
}

const reference = ref('')
const proof = shallowRef<File | null>(null)
const proofInput = useTemplateRef('proofInput')

function onProofChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0] ?? null
  input.value = ''
  if (!file) return
  const problem = proofProblem(file)
  if (problem) {
    toast.error(t(`billing.pay.errors.${problem}`))
    return
  }
  proof.value = file
}

async function submitManual() {
  if (!selected.value || reference.value.trim() === '') return
  busy.value = true
  try {
    const body = new FormData()
    body.append('gateway', selected.value.key)
    body.append('reference', reference.value.trim())
    if (proof.value) body.append('proof', proof.value)
    const { data } = await useApiFetch<{ data: Invoice }>(`/api/dashboard/billing/invoices/${number.value}/manual-payment`, { method: 'POST', body })
    toast.success(t('billing.pay.submitted'))
    reference.value = ''
    proof.value = null
    emit('updated', data)
  }
  catch (error) {
    toast.error(Object.values(apiFieldErrors(error))[0] ?? apiErrorMessage(error, t('billing.pay.submitFailed')))
  }
  finally {
    busy.value = false
  }
}
</script>

<template>
  <section
    class="rounded-2xl border border-black/10 p-5 dark:border-white/10"
    aria-labelledby="pay-invoice"
  >
    <h2
      id="pay-invoice"
      class="font-display text-base font-bold"
    >
      {{ t('billing.pay.title') }}
    </h2>

    <p
      v-if="invoice.gateways.length === 0"
      class="mt-2 text-sm text-black/60 dark:text-white/60"
    >
      {{ t('billing.pay.none') }}
    </p>

    <template v-else>
      <fieldset
        v-if="invoice.gateways.length > 1"
        class="mt-3 flex flex-wrap gap-2"
      >
        <legend class="sr-only">
          {{ t('billing.pay.choose') }}
        </legend>
        <label
          v-for="gateway in invoice.gateways"
          :key="gateway.key"
          :for="`gateway-${gateway.key}`"
          class="flex cursor-pointer items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-colors"
          :class="selectedKey === gateway.key ? 'border-brand-600 bg-brand-50 text-brand-700 dark:bg-brand-700/20 dark:text-brand-100' : 'border-black/10 dark:border-white/10'"
        >
          <input
            :id="`gateway-${gateway.key}`"
            v-model="selectedKey"
            type="radio"
            name="gateway"
            :value="gateway.key"
            class="accent-brand-600"
          >
          {{ gateway.name }}
        </label>
      </fieldset>

      <div
        v-if="selected"
        class="mt-4"
      >
        <p
          v-if="selected.description"
          class="mb-3 text-sm text-black/60 dark:text-white/60"
        >
          {{ selected.description }}
        </p>

        <div
          v-if="selected.driver === 'paypal'"
          class="flex flex-col items-start gap-2"
        >
          <UiButton
            :disabled="busy"
            @click="payWithPaypal"
          >
            {{ t('billing.pay.paypal') }}
          </UiButton>
          <p class="text-xs text-black/60 dark:text-white/60">
            {{ t('billing.pay.paypalHint') }}
          </p>
        </div>

        <div
          v-else
          class="flex flex-col gap-4"
        >
          <div
            v-if="selected.instructions"
            class="rounded-xl border border-brand-600/30 bg-brand-50/60 p-4 text-sm dark:bg-brand-700/10"
          >
            <h3 class="mb-1 font-bold">
              {{ t('billing.pay.instructions') }} — {{ selected.name }}
            </h3>
            <p class="whitespace-pre-line text-black/70 dark:text-white/70">
              {{ selected.instructions }}
            </p>
            <p class="mt-2 text-xs text-black/60 dark:text-white/60">
              {{ t('billing.pay.instructionsHint', { number: invoice.number }) }}
            </p>
          </div>

          <form
            class="flex flex-col gap-4"
            @submit.prevent="submitManual"
          >
            <div>
              <label
                for="payment-reference"
                class="mb-1.5 block text-xs font-bold"
              >{{ t('billing.pay.reference') }}</label>
              <UiInput
                id="payment-reference"
                v-model="reference"
                required
                maxlength="120"
                :placeholder="t('billing.pay.referencePlaceholder')"
                aria-describedby="payment-reference-hint"
              />
              <p
                id="payment-reference-hint"
                class="mt-1 text-xs text-black/50 dark:text-white/50"
              >
                {{ t('billing.pay.referenceHint') }}
              </p>
            </div>

            <div>
              <p class="mb-1.5 text-xs font-bold">
                {{ t('billing.pay.proof') }}
              </p>
              <div class="flex flex-wrap items-center gap-2">
                <UiButton
                  variant="secondary"
                  size="sm"
                  @click="proofInput?.click()"
                >
                  {{ t('billing.pay.chooseFile') }}
                </UiButton>
                <span
                  v-if="proof"
                  class="flex min-w-0 items-center gap-2 text-sm"
                >
                  <span class="truncate">{{ proof.name }}</span>
                  <button
                    type="button"
                    class="text-xs font-semibold text-red-700 hover:underline dark:text-red-300"
                    @click="proof = null"
                  >
                    {{ t('billing.pay.removeFile') }}
                  </button>
                </span>
              </div>
              <p class="mt-1 text-xs text-black/50 dark:text-white/50">
                {{ t('billing.pay.proofHint') }}
              </p>
              <input
                ref="proofInput"
                type="file"
                :accept="PROOF_MIME_TYPES.join(',')"
                class="hidden"
                :aria-label="t('billing.pay.proof')"
                @change="onProofChange"
              >
            </div>

            <UiButton
              type="submit"
              class="self-start"
              :disabled="busy || reference.trim() === ''"
            >
              {{ t('billing.pay.submit') }}
            </UiButton>
          </form>
        </div>
      </div>
    </template>
  </section>
</template>
