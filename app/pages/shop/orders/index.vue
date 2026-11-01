<script setup lang="ts">
import type { ShopOrderFilter, ShopOrderListMeta, ShopOrderRow } from '#shared/types/shop'

// "My orders": the signed-in shopper's shop orders, newest first.
definePageMeta({
  layout: 'dashboard',
  middleware: 'auth',
  hideBottomNav: true,
})

const { t, locale } = useI18n()
const { money } = useSiteSettings()

const filter = ref<ShopOrderFilter>('all')

const list = await usePagedList<ShopOrderRow, ShopOrderListMeta>('/shop/orders', {
  key: 'shop-orders',
  query: computed(() => ({ status: filter.value === 'all' ? undefined : filter.value })),
  itemKey: order => order.number,
})

// Chip counts come from the server, so they cover every order, not just the loaded page.
const filterOptions = computed(() => (['all', 'active', 'delivered', 'cancelled'] as const).map(value => ({
  value,
  label: t(`shop.orders.filters.${value}`),
  count: list.meta.value?.counts[value] ?? 0,
})))

const filterModel = computed({
  get: () => filter.value as string,
  set: (value: string) => {
    filter.value = value as ShopOrderFilter
  },
})

useSeoMeta({
  title: () => t('shop.orders.seoTitle'),
  description: () => t('shop.orders.subtitle'),
})
</script>

<template>
  <div class="flex flex-col gap-6">
    <UiBackButton fallback="/" />
    <div class="flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 class="font-display text-2xl font-bold">
          {{ t('shop.orders.title') }}
        </h1>
        <p class="mt-0.5 text-sm text-black/60 dark:text-white/60">
          {{ t('shop.orders.subtitle') }}
        </p>
      </div>
      <NuxtLinkLocale
        to="/shop"
        :class="linkButtonClass('primary')"
      >
        <UiIcon
          name="bag"
          :size="15"
        />{{ t('shop.title') }}
      </NuxtLinkLocale>
    </div>

    <DashboardFilterTabs
      v-model="filterModel"
      :options="filterOptions"
    />

    <ul
      v-if="list.items.value.length > 0"
      class="divide-y divide-black/10 rounded-2xl border border-black/10 dark:divide-white/10 dark:border-white/10"
    >
      <li
        v-for="order in list.items.value"
        :key="order.number"
      >
        <NuxtLinkLocale
          :to="`/shop/orders/${order.number}`"
          class="flex items-center gap-3.5 px-4 py-3.5 transition hover:bg-black/[0.02] dark:hover:bg-white/[0.04]"
        >
          <span class="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-black/5 dark:bg-white/5">
            <NuxtImg
              v-if="order.firstItem?.imageUrl"
              :src="order.firstItem.imageUrl"
              :alt="order.firstItem.name"
              width="56"
              height="56"
              class="h-full w-full object-cover"
            />
            <UiPlaceholderMedia
              v-else
              icon="bag"
              class="h-full w-full"
            />
          </span>
          <span class="min-w-0 flex-1">
            <span class="block text-sm font-bold">{{ t('shop.orders.number', { number: order.number }) }}</span>
            <span class="block truncate text-xs text-black/60 dark:text-white/60">
              {{ order.firstItem?.name }}<template v-if="order.itemCount > 1"> · {{ t('shop.orders.items', { count: order.itemCount }, order.itemCount) }}</template>
            </span>
            <span class="block text-xs text-black/50 dark:text-white/50">{{ t('shop.orders.placedOn', { date: formatDate(order.placedAt, locale) }) }}</span>
          </span>
          <span class="flex shrink-0 flex-col items-end gap-1.5">
            <span class="text-sm font-bold">{{ money(order.total) }}</span>
            <ShopOrderStatusBadge :status="order.status" />
          </span>
        </NuxtLinkLocale>
      </li>
    </ul>
    <div
      v-else-if="!list.pending.value"
      class="rounded-3xl border border-dashed border-black/15 px-6 py-16 text-center dark:border-white/15"
    >
      <h2 class="font-display text-lg font-bold">
        {{ t('shop.orders.empty') }}
      </h2>
      <p class="mt-1 text-sm text-black/60 dark:text-white/60">
        {{ t('shop.orders.emptySub') }}
      </p>
    </div>

    <DashboardLoadMore
      :shown="list.items.value.length"
      :total="list.meta.value?.total ?? 0"
      :has-more="list.hasMore.value"
      :loading="list.loadingMore.value"
      :failed="list.loadMoreFailed.value"
      @more="list.loadMore()"
    />
  </div>
</template>
