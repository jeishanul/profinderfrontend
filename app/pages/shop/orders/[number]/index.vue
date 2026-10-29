<script setup lang="ts">
import type { ShopOrder } from '#shared/types/shop'

// One shop order: timeline, items, totals, delivery address, payment and shipment. The buttons come from
// `order.can.*` (decided by the server), never from the status.
definePageMeta({
  layout: 'dashboard',
  middleware: 'auth',
  hideBottomNav: true,
})

const { t, locale } = useI18n()
const { money } = useSiteSettings()
const toast = useToast()
const { confirm } = useConfirm()
const route = useRoute()

const number = String(route.params.number)
const { data: response, error, refresh } = await useApi<{ data: ShopOrder }>(`/shop/orders/${encodeURIComponent(number)}`, {
  key: `shop-order-${number}`,
})
const order = computed(() => response.value?.data ?? null)

const banner = computed<'placed' | 'paypalCancelled' | null>(() => {
  if (route.query.paypal === 'cancelled') return 'paypalCancelled'
  if (route.query.placed === '1') return 'placed'
  return null
})

const busy = ref(false)

async function cancelOrder() {
  if (!order.value) return
  const confirmed = await confirm({
    title: t('shop.order.cancelConfirm.title'),
    message: t('shop.order.cancelConfirm.message'),
    confirmLabel: t('shop.order.cancelConfirm.confirm'),
    tone: 'danger',
  })
  if (!confirmed) return
  busy.value = true
  try {
    const result = await useApiFetch<{ data: ShopOrder }>(`/api/shop/orders/${encodeURIComponent(number)}/cancel`, { method: 'POST', body: {} })
    response.value = result
    toast.success(t('shop.order.cancelled'))
  }
  catch (cancelError) {
    toast.error(apiErrorMessage(cancelError, t('shop.order.cancelFailed')))
    await refresh()
  }
  finally {
    busy.value = false
  }
}

async function payWithPaypal() {
  busy.value = true
  try {
    const { approveUrl } = await useApiFetch<{ approveUrl: string }>(`/api/shop/orders/${encodeURIComponent(number)}/paypal`, { method: 'POST' })
    window.location.href = approveUrl
  }
  catch (payError) {
    toast.error(apiErrorMessage(payError, t('shop.order.payStartFailed')))
    busy.value = false
  }
}

const addressLine = computed(() => {
  const address = order.value?.address
  if (!address) return ''
  return [address.street, address.barangayName, address.cityName, address.provinceName, address.postalCode].filter(Boolean).join(', ')
})

const history = computed(() => [...(order.value?.history ?? [])].reverse())

useSeoMeta({
  title: () => t('shop.order.seoTitle', { number }),
  description: () => t('shop.orders.subtitle'),
})
</script>

<template>
  <div class="flex flex-col gap-6">
    <UiBackButton fallback="/shop/orders" />
    <NuxtLinkLocale
      to="/shop/orders"
      class="hidden items-center gap-1.5 text-sm font-semibold text-black/60 hover:text-black md:inline-flex dark:text-white/60 dark:hover:text-white"
    >
      <UiIcon
        name="chevron-left"
        :size="15"
      />
      {{ t('shop.orders.backToOrders') }}
    </NuxtLinkLocale>

    <p
      v-if="error || !order"
      role="alert"
      class="text-sm text-red-700 dark:text-red-300"
    >
      {{ t('shop.orders.loadFailed') }}
    </p>

    <template v-else>
      <div
        v-if="banner"
        role="status"
        class="rounded-2xl px-4 py-3 text-sm font-semibold"
        :class="banner === 'placed' ? 'bg-brand-50 text-brand-700 dark:bg-brand-700/20 dark:text-brand-100' : 'bg-accent-50 text-accent-700 dark:bg-accent-700/20 dark:text-accent-100'"
      >
        {{ banner === 'placed' ? t('shop.order.placedBanner') : t('shop.order.paypalCancelled') }}
      </div>

      <div class="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 class="font-display text-2xl font-bold">
            {{ t('shop.orders.number', { number: order.number }) }}
          </h1>
          <p class="mt-0.5 text-sm text-black/60 dark:text-white/60">
            {{ t('shop.orders.placedOn', { date: formatDateTime(order.placedAt, locale) }) }}
          </p>
        </div>
        <ShopOrderStatusBadge :status="order.status" />
      </div>

      <div
        v-if="order.can.pay || order.can.cancel"
        class="flex flex-wrap items-center gap-3"
      >
        <UiButton
          v-if="order.can.pay"
          :disabled="busy"
          @click="payWithPaypal"
        >
          {{ t('shop.order.payWithPaypal') }}
        </UiButton>
        <UiButton
          v-if="order.can.cancel"
          variant="ghost"
          :disabled="busy"
          @click="cancelOrder"
        >
          {{ t('shop.order.cancel') }}
        </UiButton>
        <span
          v-if="order.can.pay && order.paymentExpiresAt"
          class="text-xs text-black/60 dark:text-white/60"
        >
          {{ t('shop.order.payBy', { date: formatDateTime(order.paymentExpiresAt, locale) }) }}
        </span>
      </div>

      <div class="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div class="space-y-6">
          <section class="rounded-2xl border border-black/10 p-5 dark:border-white/10">
            <h2 class="font-display text-base font-bold">
              {{ t('shop.order.items') }}
            </h2>
            <ul class="divide-y divide-black/10 dark:divide-white/10">
              <li
                v-for="item in order.items"
                :key="item.sku"
                class="flex gap-3.5 py-3.5"
              >
                <span class="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-black/5 dark:bg-white/5">
                  <NuxtImg
                    v-if="item.imageUrl"
                    :src="item.imageUrl"
                    :alt="item.productName"
                    width="64"
                    height="64"
                    class="h-full w-full object-cover"
                  />
                  <UiPlaceholderMedia
                    v-else
                    icon="bag"
                    class="h-full w-full"
                  />
                </span>
                <span class="min-w-0 flex-1 text-sm">
                  <NuxtLinkLocale
                    v-if="item.productSlug"
                    :to="`/shop/${item.productSlug}`"
                    class="font-bold hover:text-brand-700 dark:hover:text-brand-400"
                  >{{ item.productName }}</NuxtLinkLocale>
                  <span
                    v-else
                    class="font-bold"
                  >{{ item.productName }}</span>
                  <span
                    v-if="item.variantLabel"
                    class="block text-xs text-black/60 dark:text-white/60"
                  >{{ item.variantLabel }}</span>
                  <span class="block text-xs text-black/50 dark:text-white/50">{{ money(item.unitPrice) }} × {{ item.quantity }}</span>
                </span>
                <span class="shrink-0 text-sm font-bold">{{ money(item.lineTotal) }}</span>
              </li>
            </ul>
            <dl class="space-y-1.5 border-t border-black/10 pt-3 text-sm dark:border-white/10">
              <div class="flex justify-between">
                <dt>{{ t('shop.checkout.subtotal') }}</dt>
                <dd>{{ money(order.subtotal) }}</dd>
              </div>
              <div class="flex justify-between">
                <dt>{{ t('shop.checkout.shipping') }}</dt>
                <dd>{{ order.shippingFee === 0 ? t('shop.checkout.free') : money(order.shippingFee) }}</dd>
              </div>
              <div class="flex justify-between text-base font-bold">
                <dt>{{ t('shop.checkout.total') }}</dt>
                <dd>{{ money(order.total) }}</dd>
              </div>
            </dl>
          </section>

          <section class="rounded-2xl border border-black/10 p-5 dark:border-white/10">
            <h2 class="mb-3 font-display text-base font-bold">
              {{ t('shop.order.timeline') }}
            </h2>
            <ol class="space-y-3 border-l border-black/10 pl-4 dark:border-white/10">
              <li
                v-for="(entry, index) in history"
                :key="`${entry.status}-${entry.at}`"
                class="relative"
              >
                <span
                  class="absolute top-1 -left-[21px] h-2.5 w-2.5 rounded-full"
                  :class="index === 0 ? 'bg-brand-600' : 'bg-black/20 dark:bg-white/20'"
                  aria-hidden="true"
                />
                <p class="text-sm font-semibold">
                  {{ t(`shop.status.${entry.status}`) }}
                </p>
                <p class="text-xs text-black/50 dark:text-white/50">
                  {{ formatDateTime(entry.at, locale) }}
                </p>
                <p
                  v-if="entry.note"
                  class="mt-0.5 text-xs text-black/70 dark:text-white/70"
                >
                  {{ entry.note }}
                </p>
              </li>
            </ol>
          </section>
        </div>

        <aside class="h-fit space-y-4 rounded-2xl border border-black/10 p-5 text-sm dark:border-white/10">
          <div>
            <h2 class="mb-1 text-xs font-bold tracking-wide text-black/50 uppercase dark:text-white/50">
              {{ t('shop.order.deliverTo') }}
            </h2>
            <p class="font-semibold">
              {{ order.address.recipientName }}
            </p>
            <p class="text-black/60 dark:text-white/60">
              {{ order.address.phone }}
            </p>
            <p class="text-black/60 dark:text-white/60">
              {{ addressLine }}
            </p>
          </div>
          <div>
            <h2 class="mb-1 text-xs font-bold tracking-wide text-black/50 uppercase dark:text-white/50">
              {{ t('shop.order.payment') }}
            </h2>
            <p>{{ t(`shop.checkout.methods.${order.paymentMethod}`) }}</p>
            <p class="text-black/60 dark:text-white/60">
              {{ t('shop.order.paymentStatus') }}: {{ t(`shop.paymentStatus.${order.paymentStatus}`) }}
            </p>
          </div>
          <div v-if="order.courier || order.trackingNumber">
            <h2 class="mb-1 text-xs font-bold tracking-wide text-black/50 uppercase dark:text-white/50">
              {{ t('shop.order.shipment') }}
            </h2>
            <p v-if="order.courier">
              {{ t('shop.order.courier', { courier: order.courier }) }}
            </p>
            <p v-if="order.trackingNumber">
              {{ t('shop.order.tracking', { number: order.trackingNumber }) }}
            </p>
          </div>
          <div v-if="order.note">
            <h2 class="mb-1 text-xs font-bold tracking-wide text-black/50 uppercase dark:text-white/50">
              {{ t('shop.order.note') }}
            </h2>
            <p class="whitespace-pre-line text-black/70 dark:text-white/70">
              {{ order.note }}
            </p>
          </div>
        </aside>
      </div>
    </template>
  </div>
</template>
