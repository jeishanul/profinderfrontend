<script setup lang="ts">
import type { ShopOrder } from '#shared/types/shop'

// A plain, printable receipt for one order. No site chrome (`layout: false`), so the browser's "Print / Save as PDF"
// gives a clean page; the buttons hide themselves in print.
definePageMeta({
  layout: false,
  middleware: 'auth',
})

const { t, locale } = useI18n()
const { money, settings } = useSiteSettings()
const route = useRoute()

const number = String(route.params.number)
const { data: response, error } = await useApi<{ data: ShopOrder }>(`/shop/orders/${encodeURIComponent(number)}`, {
  key: `shop-order-${number}`,
})
const order = computed(() => response.value?.data ?? null)

const addressLine = computed(() => {
  const address = order.value?.address
  if (!address) return ''
  return [address.street, address.barangayName, address.cityName, address.provinceName, address.postalCode].filter(Boolean).join(', ')
})

function print() {
  window.print()
}

useSeoMeta({
  title: () => t('shop.receipt.seoTitle', { number }),
  robots: 'noindex, nofollow',
})
</script>

<template>
  <main class="mx-auto max-w-2xl bg-white px-4 py-8 text-black print:max-w-none print:px-0 print:py-0">
    <div class="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
      <NuxtLinkLocale
        :to="`/shop/orders/${encodeURIComponent(number)}`"
        class="text-sm font-semibold text-brand-700 hover:underline"
      >
        {{ t('shop.receipt.back') }}
      </NuxtLinkLocale>
      <UiButton
        v-if="order"
        @click="print"
      >
        {{ t('shop.receipt.print') }}
      </UiButton>
    </div>

    <p
      v-if="error || !order"
      role="alert"
      class="text-sm text-red-700"
    >
      {{ t('shop.orders.loadFailed') }}
    </p>

    <article
      v-else
      class="rounded-2xl border border-black/10 p-6 print:rounded-none print:border-0 print:p-0"
    >
      <header class="flex items-start justify-between gap-4 border-b border-black/10 pb-4">
        <div>
          <p class="font-display text-xl font-bold">
            {{ settings.siteName }}
          </p>
          <p
            v-if="settings.contactEmail || settings.contactPhone"
            class="mt-0.5 text-xs text-black/60"
          >
            {{ [settings.contactEmail, settings.contactPhone].filter(Boolean).join(' · ') }}
          </p>
        </div>
        <div class="text-right">
          <h1 class="font-display text-lg font-bold">
            {{ t('shop.receipt.title') }}
          </h1>
          <p class="text-sm">
            {{ t('shop.receipt.orderNumber', { number: order.number }) }}
          </p>
          <p class="text-xs text-black/60">
            {{ t('shop.receipt.placedOn', { date: formatDateTime(order.placedAt, locale) }) }}
          </p>
        </div>
      </header>

      <section class="grid gap-4 border-b border-black/10 py-4 text-sm sm:grid-cols-2">
        <div>
          <h2 class="text-xs font-bold uppercase tracking-wide text-black/50">
            {{ t('shop.receipt.billedTo') }}
          </h2>
          <p class="mt-1 font-semibold">
            {{ order.address.recipientName }}
          </p>
          <p>{{ order.address.phone }}</p>
          <p>{{ addressLine }}</p>
        </div>
        <div>
          <h2 class="text-xs font-bold uppercase tracking-wide text-black/50">
            {{ t('shop.receipt.payment') }}
          </h2>
          <p class="mt-1">
            {{ t(`shop.checkout.methods.${order.paymentMethod}`) }}
          </p>
          <p>{{ t(`shop.paymentStatus.${order.paymentStatus}`) }}</p>
          <p>{{ t(`shop.status.${order.status}`) }}</p>
        </div>
      </section>

      <table class="mt-4 w-full text-sm">
        <thead>
          <tr class="border-b border-black/10 text-left text-xs uppercase tracking-wide text-black/50">
            <th class="py-2 font-bold">
              {{ t('shop.receipt.item') }}
            </th>
            <th class="py-2 text-right font-bold">
              {{ t('shop.receipt.qty') }}
            </th>
            <th class="py-2 text-right font-bold">
              {{ t('shop.receipt.unitPrice') }}
            </th>
            <th class="py-2 text-right font-bold">
              {{ t('shop.receipt.amount') }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="item in order.items"
            :key="item.sku"
            class="border-b border-black/5 align-top"
          >
            <td class="py-2 pr-2">
              <p class="font-semibold">
                {{ item.productName }}
              </p>
              <p class="text-xs text-black/60">
                {{ [item.variantLabel, item.sku].filter(Boolean).join(' · ') }}
              </p>
            </td>
            <td class="py-2 text-right">
              {{ item.quantity }}
            </td>
            <td class="py-2 text-right">
              {{ money(item.unitPrice) }}
            </td>
            <td class="py-2 text-right">
              {{ money(item.lineTotal) }}
            </td>
          </tr>
        </tbody>
      </table>

      <dl class="ml-auto mt-4 w-full max-w-xs space-y-1 text-sm">
        <div class="flex justify-between">
          <dt>{{ t('shop.receipt.subtotal') }}</dt>
          <dd>{{ money(order.subtotal) }}</dd>
        </div>
        <div class="flex justify-between">
          <dt>{{ t('shop.receipt.shipping') }}</dt>
          <dd>{{ order.shippingFee === 0 ? t('shop.checkout.free') : money(order.shippingFee) }}</dd>
        </div>
        <div class="flex justify-between border-t border-black/10 pt-1 text-base font-bold">
          <dt>{{ t('shop.receipt.total') }}</dt>
          <dd>{{ money(order.total) }}</dd>
        </div>
      </dl>

      <footer class="mt-6 border-t border-black/10 pt-4 text-center text-xs text-black/60">
        <p v-if="settings.shopPriceNote">
          {{ settings.shopPriceNote }}
        </p>
        <p class="mt-1 font-semibold text-black">
          {{ t('shop.receipt.thanks') }}
        </p>
      </footer>
    </article>
  </main>
</template>
