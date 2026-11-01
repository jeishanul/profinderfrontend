<script setup lang="ts">
import type { ShopAddress, ShopAddressInput } from '#shared/types/shop'

// Auto-imported as <ShopAddressForm/>. Adds or edits a saved delivery address (checkout). The province → city →
// barangay pickers are the app's own `<UiLocationPicker variant="form">`. Mount it fresh (`v-if`/`:key`) per address:
// the picker clears city/barangay when the province changes, so the initial values must be there from the start.
const props = withDefaults(defineProps<{ address?: ShopAddress | null }>(), { address: null })

const emit = defineEmits<{
  saved: [address: ShopAddress]
  cancel: []
}>()

const { t } = useI18n()
const toast = useToast()

const form = reactive({
  label: props.address?.label ?? '',
  recipientName: props.address?.recipientName ?? '',
  phone: props.address?.phone ?? '',
  provinceCode: props.address?.provinceCode ?? null as string | null,
  cityCode: props.address?.cityCode ?? null as string | null,
  barangay: props.address?.barangay ?? null as string | null,
  street: props.address?.street ?? '',
  postalCode: props.address?.postalCode ?? '',
  isDefault: props.address?.isDefault ?? false,
})

const errors = ref<Record<string, string>>({})
const saving = ref(false)

const isComplete = computed(() => !!(form.recipientName.trim() && form.phone.trim() && form.provinceCode && form.cityCode && form.street.trim()))

async function submit() {
  if (!isComplete.value) {
    toast.error(t('shop.address.required'))
    return
  }
  const body: ShopAddressInput = {
    label: form.label.trim() || null,
    recipientName: form.recipientName.trim(),
    phone: form.phone.trim(),
    provinceCode: form.provinceCode!,
    cityCode: form.cityCode!,
    barangay: form.barangay || null,
    street: form.street.trim(),
    postalCode: form.postalCode.trim() || null,
    isDefault: form.isDefault,
  }
  saving.value = true
  errors.value = {}
  try {
    const response = props.address
      ? await useApiFetch<{ data: ShopAddress }>(`/api/shop/addresses/${props.address.id}`, { method: 'PUT', body })
      : await useApiFetch<{ data: ShopAddress }>('/api/shop/addresses', { method: 'POST', body })
    toast.success(t('shop.checkout.addressSaved'))
    emit('saved', response.data)
  }
  catch (error) {
    errors.value = apiFieldErrors(error)
    toast.error(apiErrorMessage(error, t('shop.checkout.addressFailed')))
  }
  finally {
    saving.value = false
  }
}

const labelClass = 'mb-1.5 block text-xs font-bold'
const errorClass = 'mt-1 text-xs text-red-700 dark:text-red-300'
</script>

<template>
  <form
    class="rounded-2xl border border-black/10 p-4 dark:border-white/10"
    novalidate
    @submit.prevent="submit"
  >
    <h3 class="mb-4 text-sm font-bold">
      {{ address ? t('shop.address.editTitle') : t('shop.address.newTitle') }}
    </h3>
    <div class="grid gap-4 sm:grid-cols-2">
      <div>
        <label
          for="shop-address-name"
          :class="labelClass"
        >{{ t('shop.address.recipientName') }}</label>
        <UiInput
          id="shop-address-name"
          v-model="form.recipientName"
          autocomplete="name"
          required
        />
        <p
          v-if="errors.recipientName"
          :class="errorClass"
        >
          {{ errors.recipientName }}
        </p>
      </div>
      <div>
        <label
          for="shop-address-phone"
          :class="labelClass"
        >{{ t('shop.address.phone') }}</label>
        <UiInput
          id="shop-address-phone"
          v-model="form.phone"
          type="tel"
          autocomplete="tel"
          required
        />
        <p
          v-if="errors.phone"
          :class="errorClass"
        >
          {{ errors.phone }}
        </p>
      </div>
      <UiLocationPicker
        id="shop-address-location"
        v-model:province="form.provinceCode"
        v-model:city="form.cityCode"
        v-model:barangay="form.barangay"
        variant="form"
      />
      <div class="sm:col-span-2">
        <label
          for="shop-address-street"
          :class="labelClass"
        >{{ t('shop.address.street') }}</label>
        <UiInput
          id="shop-address-street"
          v-model="form.street"
          autocomplete="street-address"
          required
        />
        <p
          v-if="errors.street"
          :class="errorClass"
        >
          {{ errors.street }}
        </p>
      </div>
      <div>
        <label
          for="shop-address-postal"
          :class="labelClass"
        >{{ t('shop.address.postalCode') }}</label>
        <UiInput
          id="shop-address-postal"
          v-model="form.postalCode"
          autocomplete="postal-code"
        />
      </div>
      <div>
        <label
          for="shop-address-label"
          :class="labelClass"
        >{{ t('shop.address.label') }}</label>
        <UiInput
          id="shop-address-label"
          v-model="form.label"
          :placeholder="t('shop.address.labelPlaceholder')"
        />
      </div>
    </div>
    <label
      for="shop-address-default"
      class="mt-4 flex items-center gap-2 text-sm"
    >
      <input
        id="shop-address-default"
        v-model="form.isDefault"
        type="checkbox"
        class="h-4 w-4 accent-brand-600"
      >
      {{ t('shop.address.isDefault') }}
    </label>
    <div class="mt-5 flex justify-end gap-2">
      <UiButton
        variant="ghost"
        @click="emit('cancel')"
      >
        {{ t('shop.address.cancel') }}
      </UiButton>
      <UiButton
        type="submit"
        :disabled="saving"
      >
        {{ t('shop.address.save') }}
      </UiButton>
    </div>
  </form>
</template>
