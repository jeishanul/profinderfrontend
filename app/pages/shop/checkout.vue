<script setup lang="ts">
import type {
  ShopAddress,
  ShopCartItemInput,
  ShopCheckoutPreview,
  ShopCheckoutSource,
  ShopPaymentMethod,
  ShopPlaceOrderResult,
} from '#shared/types/shop'

// Checkout, from the cart or straight from a product (`?buy=<sku>&qty=<n>`, "Buy now", which leaves the cart alone).
// Browser-only and signed-in only (see `routeRules`). Every total shown comes from the server's preview; placing the
// order sends the total the shopper saw, and the server refuses with `price_changed` if it no longer matches.
definePageMeta({ middleware: 'auth' })

const { t } = useI18n()
const { money, settings } = useSiteSettings()
const toast = useToast()
const { confirm } = useConfirm()
const route = useRoute()
const localePath = useLocalePath()
const cart = useShopCart()

const buySku = typeof route.query.buy === 'string' && route.query.buy ? route.query.buy : null
const source: ShopCheckoutSource = buySku ? 'buy_now' : 'cart'
const buyItems: ShopCartItemInput[] | undefined = buySku
  ? [{ sku: buySku, quantity: Math.max(1, Math.floor(Number(route.query.qty) || 1)) }]
  : undefined

const { data: addressesResponse, refresh: refreshAddresses, status: addressesStatus } = useApi<{ data: ShopAddress[] }>('/shop/addresses', {
  key: 'shop-addresses',
  server: false,
})
const addresses = computed(() => addressesResponse.value?.data ?? [])

const selectedAddressId = ref<number | null>(null)
// Start on the default address (else the first); keep the choice while it still exists.
watch(addresses, (list) => {
  if (list.some(address => address.id === selectedAddressId.value)) return
  selectedAddressId.value = (list.find(address => address.isDefault) ?? list[0])?.id ?? null
}, { immediate: true })

/** `null` = closed, `'new'` = adding, a number = editing that address. */
const formFor = ref<'new' | number | null>(null)
const editingAddress = computed(() => (typeof formFor.value === 'number' ? addresses.value.find(address => address.id === formFor.value) ?? null : null))
watch(addressesStatus, (status) => {
  if (status === 'success' && addresses.value.length === 0) formFor.value = 'new'
})

async function onAddressSaved(address: ShopAddress) {
  formFor.value = null
  await refreshAddresses()
  selectedAddressId.value = address.id
}

async function setDefault(address: ShopAddress) {
  try {
    await useApiFetch(`/api/shop/addresses/${address.id}`, { method: 'PUT', body: { ...address, isDefault: true } })
    await refreshAddresses()
  }
  catch (error) {
    toast.error(apiErrorMessage(error, t('shop.checkout.addressFailed')))
  }
}

async function removeAddress(address: ShopAddress) {
  const confirmed = await confirm({
    title: t('shop.checkout.deleteConfirm.title'),
    message: t('shop.checkout.deleteConfirm.message'),
    confirmLabel: t('shop.checkout.deleteConfirm.confirm'),
    tone: 'danger',
  })
  if (!confirmed) return
  try {
    await useApiFetch(`/api/shop/addresses/${address.id}`, { method: 'DELETE' })
    toast.success(t('shop.checkout.addressDeleted'))
    await refreshAddresses()
  }
  catch (error) {
    toast.error(apiErrorMessage(error, t('shop.checkout.addressFailed')))
  }
}

// The preview: recomputed whenever the address changes.
const preview = shallowRef<ShopCheckoutPreview | null>(null)
const previewFailed = ref(false)
const previewLoading = ref(false)
const guard = createLatestGuard()

async function loadPreview() {
  const token = guard.bump()
  previewLoading.value = true
  previewFailed.value = false
  try {
    const response = await useApiFetch<{ data: ShopCheckoutPreview }>('/api/shop/checkout/preview', {
      method: 'POST',
      body: { source, items: buyItems, addressId: selectedAddressId.value ?? undefined },
    })
    if (!guard.isStale(token)) preview.value = response.data
  }
  catch {
    if (!guard.isStale(token)) previewFailed.value = true
  }
  finally {
    if (!guard.isStale(token)) previewLoading.value = false
  }
}

// A cart merged at login must be in place before it is previewed.
const cartReady = ref(source === 'buy_now')
onMounted(async () => {
  await cart.whenSynced()
  cartReady.value = true
})
watch([cartReady, selectedAddressId], ([ready]) => {
  if (ready) void loadPreview()
}, { immediate: true })

const paymentMethod = ref<ShopPaymentMethod | null>(null)
watch(preview, (next) => {
  const methods = next?.paymentMethods ?? []
  if (!methods.some(method => method.key === paymentMethod.value && method.available)) {
    paymentMethod.value = methods.find(method => method.available)?.key ?? null
  }
})

const note = ref('')
const placing = ref(false)

const blocker = computed<string | null>(() => {
  const current = preview.value
  if (!current) return null
  if (current.items.length === 0) return t('shop.checkout.empty')
  if (current.hasIssues) return t('shop.checkout.hasIssues')
  if (current.deliverable === false) return t('shop.checkout.notDeliverable')
  return null
})

const canPlace = computed(() => !!preview.value && !blocker.value && !previewLoading.value && !placing.value
  && selectedAddressId.value !== null && paymentMethod.value !== null && preview.value.total !== null)

async function placeOrder() {
  if (!canPlace.value || !preview.value || selectedAddressId.value === null || !paymentMethod.value) return
  placing.value = true
  try {
    const result = await useApiFetch<ShopPlaceOrderResult>('/api/shop/orders', {
      method: 'POST',
      body: {
        source,
        items: buyItems,
        addressId: selectedAddressId.value,
        paymentMethod: paymentMethod.value,
        note: note.value.trim() || undefined,
        expectedTotal: preview.value.total,
      },
    })
    if (source === 'cart') void cart.refresh().catch(() => {})
    if (result.approveUrl) {
      window.location.href = result.approveUrl
      return
    }
    await navigateTo(localePath({ path: `/shop/orders/${result.data.number}`, query: { placed: '1' } }))
  }
  catch (error) {
    const code = apiErrorCode(error)
    if (code === 'price_changed') {
      const fresh = apiErrorField<ShopCheckoutPreview>(error, 'preview')
      if (fresh) preview.value = fresh
      else await loadPreview()
      toast.info(t('shop.checkout.priceChanged'))
    }
    else {
      toast.error(code && ['cart_issues', 'not_deliverable', 'payment_unavailable', 'empty'].includes(code)
        ? t(`shop.checkout.errors.${code}`)
        : apiErrorMessage(error, t('shop.checkout.placeFailed')))
      if (code) await loadPreview()
    }
  }
  finally {
    placing.value = false
  }
}

function paymentReason(reason: string | null): string {
  return reason === 'cod_limit' || reason === 'cod_area'
    ? t(`shop.checkout.unavailableReasons.${reason}`)
    : t('shop.checkout.unavailableReasons.default')
}

function addressLine(address: ShopAddress): string {
  return [address.street, address.barangay, address.cityName, address.provinceName, address.postalCode].filter(Boolean).join(', ')
}

useSeoMeta({
  title: () => t('shop.checkout.seoTitle'),
  description: () => t('shop.seoDescription'),
})
useSchemaOrg([defineWebPage()])
</script>

<template>
  <div class="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-10">
    <NuxtLinkLocale
      v-if="source === 'cart'"
      to="/shop/cart"
      class="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-black/60 hover:text-black dark:text-white/60 dark:hover:text-white"
    >
      <UiIcon
        name="chevron-left"
        :size="15"
      />
      {{ t('shop.checkout.backToCart') }}
    </NuxtLinkLocale>
    <h1 class="font-display text-3xl font-bold tracking-tight">
      {{ t('shop.checkout.title') }}
    </h1>

    <div class="mt-6 grid gap-8 lg:grid-cols-[1fr_340px]">
      <div class="space-y-8">
        <!-- Address -->
        <section>
          <h2 class="mb-3 font-display text-lg font-bold">
            {{ t('shop.checkout.address') }}
          </h2>
          <fieldset
            v-if="addresses.length > 0"
            class="space-y-2"
          >
            <legend class="sr-only">
              {{ t('shop.checkout.address') }}
            </legend>
            <div
              v-for="address in addresses"
              :key="address.id"
              class="rounded-2xl border p-4 transition"
              :class="selectedAddressId === address.id ? 'border-brand-600 bg-brand-50/50 dark:bg-brand-700/10' : 'border-black/10 dark:border-white/10'"
            >
              <label
                :for="`shop-address-${address.id}`"
                class="flex cursor-pointer gap-3"
              >
                <input
                  :id="`shop-address-${address.id}`"
                  v-model="selectedAddressId"
                  type="radio"
                  name="shop-address"
                  :value="address.id"
                  class="mt-1 h-4 w-4 accent-brand-600"
                >
                <span class="min-w-0 flex-1 text-sm">
                  <span class="flex flex-wrap items-center gap-2 font-bold">
                    {{ address.recipientName }}
                    <span class="font-normal text-black/50 dark:text-white/50">{{ address.phone }}</span>
                    <UiTag
                      v-if="address.label"
                      size="sm"
                    >{{ address.label }}</UiTag>
                    <UiTag
                      v-if="address.isDefault"
                      variant="primary"
                      size="sm"
                    >{{ t('shop.checkout.default') }}</UiTag>
                  </span>
                  <span class="mt-0.5 block text-black/60 dark:text-white/60">{{ addressLine(address) }}</span>
                </span>
              </label>
              <div class="mt-2 flex flex-wrap gap-3 pl-7 text-xs font-semibold">
                <button
                  type="button"
                  class="text-brand-700 hover:text-brand-600 dark:text-brand-400"
                  @click="formFor = address.id"
                >
                  {{ t('shop.checkout.edit') }}
                </button>
                <button
                  v-if="!address.isDefault"
                  type="button"
                  class="text-brand-700 hover:text-brand-600 dark:text-brand-400"
                  @click="setDefault(address)"
                >
                  {{ t('shop.checkout.makeDefault') }}
                </button>
                <button
                  type="button"
                  class="text-black/50 hover:text-red-600 dark:text-white/50 dark:hover:text-red-400"
                  @click="removeAddress(address)"
                >
                  {{ t('shop.checkout.delete') }}
                </button>
              </div>
            </div>
          </fieldset>
          <p
            v-else-if="addressesStatus === 'success'"
            class="text-sm text-black/60 dark:text-white/60"
          >
            {{ t('shop.checkout.noAddresses') }}
          </p>

          <ShopAddressForm
            v-if="formFor !== null"
            :key="String(formFor)"
            class="mt-3"
            :address="editingAddress"
            @saved="onAddressSaved"
            @cancel="formFor = null"
          />
          <UiButton
            v-else
            variant="ghost"
            class="mt-2"
            @click="formFor = 'new'"
          >
            <UiIcon
              name="plus"
              :size="14"
            />
            {{ t('shop.checkout.addAddress') }}
          </UiButton>
        </section>

        <!-- Payment -->
        <section v-if="preview">
          <h2 class="mb-3 font-display text-lg font-bold">
            {{ t('shop.checkout.payment') }}
          </h2>
          <fieldset class="space-y-2">
            <legend class="sr-only">
              {{ t('shop.checkout.payment') }}
            </legend>
            <label
              v-for="method in preview.paymentMethods"
              :key="method.key"
              :for="`shop-payment-${method.key}`"
              class="flex gap-3 rounded-2xl border p-4 text-sm"
              :class="[
                paymentMethod === method.key ? 'border-brand-600 bg-brand-50/50 dark:bg-brand-700/10' : 'border-black/10 dark:border-white/10',
                method.available ? 'cursor-pointer' : 'cursor-not-allowed opacity-60',
              ]"
            >
              <input
                :id="`shop-payment-${method.key}`"
                v-model="paymentMethod"
                type="radio"
                name="shop-payment"
                :value="method.key"
                :disabled="!method.available"
                class="mt-0.5 h-4 w-4 accent-brand-600"
              >
              <span>
                <span class="block font-bold">{{ t(`shop.checkout.methods.${method.key}`) }}</span>
                <span class="block text-xs text-black/60 dark:text-white/60">
                  {{ method.available ? t(`shop.checkout.methodHints.${method.key}`) : paymentReason(method.reason) }}
                </span>
              </span>
            </label>
          </fieldset>
        </section>

        <section>
          <label
            for="shop-note"
            class="mb-1.5 block text-sm font-bold"
          >{{ t('shop.checkout.note') }}</label>
          <textarea
            id="shop-note"
            v-model="note"
            rows="3"
            maxlength="500"
            :placeholder="t('shop.checkout.notePlaceholder')"
            class="w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm outline-none focus:border-brand-500 dark:border-white/10 dark:bg-white/5"
          />
        </section>
      </div>

      <!-- Summary -->
      <aside class="h-fit rounded-3xl border border-black/10 p-5 dark:border-white/10">
        <h2 class="font-display text-lg font-bold">
          {{ t('shop.checkout.summary') }}
        </h2>
        <p
          v-if="previewFailed"
          role="alert"
          class="mt-3 text-sm text-red-700 dark:text-red-300"
        >
          {{ t('shop.checkout.previewFailed') }}
        </p>
        <div
          v-else-if="!preview"
          class="mt-3 h-32 animate-pulse rounded-2xl bg-black/5 dark:bg-white/5"
        />
        <template v-else>
          <div class="divide-y divide-black/10 dark:divide-white/10">
            <ShopCartLine
              v-for="line in preview.items"
              :key="line.sku"
              :line="line"
            />
          </div>
          <dl class="mt-3 space-y-1.5 border-t border-black/10 pt-3 text-sm dark:border-white/10">
            <div class="flex justify-between">
              <dt>{{ t('shop.checkout.subtotal') }}</dt>
              <dd>{{ money(preview.subtotal) }}</dd>
            </div>
            <div class="flex justify-between">
              <dt>{{ t('shop.checkout.shipping') }}</dt>
              <dd>
                <template v-if="preview.shippingFee === null">
                  <span class="text-black/50 dark:text-white/50">{{ t('shop.checkout.shippingPending') }}</span>
                </template>
                <template v-else-if="preview.shippingFee === 0">
                  {{ t('shop.checkout.free') }}
                </template>
                <template v-else>
                  {{ money(preview.shippingFee) }}
                </template>
              </dd>
            </div>
            <div class="flex justify-between pt-1.5 text-base font-bold">
              <dt>{{ t('shop.checkout.total') }}</dt>
              <dd>{{ preview.total === null ? '—' : money(preview.total) }}</dd>
            </div>
          </dl>
          <p
            v-if="settings.shopPriceNote"
            class="mt-2 text-xs text-black/50 dark:text-white/50"
          >
            {{ settings.shopPriceNote }}
          </p>
          <p
            v-if="blocker"
            role="alert"
            class="mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 dark:bg-red-900/30 dark:text-red-300"
          >
            {{ blocker }}
          </p>
          <UiButton
            class="mt-4 w-full py-3"
            :disabled="!canPlace"
            @click="placeOrder"
          >
            {{ placing ? t('shop.checkout.placing') : t('shop.checkout.placeOrder') }}
          </UiButton>
        </template>
      </aside>
    </div>
  </div>
</template>
