<script setup lang="ts">
// Auto-imported as <ShopPrice/>. A price in the site currency, a "from" price for a range, and the struck-through
// compare-at price when it is higher.
const props = withDefaults(
  defineProps<{
    price: number
    /** The top of a price range (product cards of products with several variants). */
    priceMax?: number | null
    compareAt?: number | null
    size?: 'sm' | 'md' | 'lg'
  }>(),
  { priceMax: null, compareAt: null, size: 'md' },
)

const { t } = useI18n()
const { money } = useSiteSettings()

const isRange = computed(() => props.priceMax !== null && props.priceMax > props.price)
const showCompare = computed(() => props.compareAt !== null && props.compareAt > (props.priceMax ?? props.price))
const priceClass = computed(() => ({ sm: 'text-sm', md: 'text-base', lg: 'text-2xl' })[props.size])
</script>

<template>
  <div class="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
    <span
      class="font-bold text-black dark:text-white"
      :class="priceClass"
    >
      {{ isRange ? t('shop.from', { price: money(price) }) : money(price) }}
    </span>
    <span
      v-if="showCompare"
      class="text-xs text-black/50 line-through dark:text-white/50"
    >
      <span class="sr-only">{{ t('shop.compareAt', { price: money(compareAt!) }) }}</span>
      <span aria-hidden="true">{{ money(compareAt!) }}</span>
    </span>
  </div>
</template>
