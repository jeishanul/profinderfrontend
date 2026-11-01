<script setup lang="ts">
import type { ShopProductCard } from '#shared/types/shop'

// Auto-imported as <ShopProductCard/>. One product in the storefront grid.
defineProps<{
  product: ShopProductCard
}>()

const { t } = useI18n()
</script>

<template>
  <article class="group flex flex-col overflow-hidden rounded-2xl border border-black/10 bg-white transition hover:border-brand-500/50 hover:shadow-md dark:border-white/10 dark:bg-white/5">
    <NuxtLinkLocale
      :to="`/shop/${product.slug}`"
      class="relative block aspect-square overflow-hidden bg-black/5 dark:bg-white/5"
    >
      <NuxtImg
        v-if="product.imageUrl"
        :src="product.imageUrl"
        :alt="product.imageAlt || product.name"
        sizes="(min-width: 1024px) 280px, (min-width: 640px) 33vw, 50vw"
        loading="lazy"
        class="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
      />
      <UiPlaceholderMedia
        v-else
        icon="bag"
        class="h-full w-full"
      />
      <UiTag
        v-if="!product.inStock"
        variant="danger"
        size="sm"
        class="absolute top-2 left-2"
      >
        {{ t('shop.outOfStock') }}
      </UiTag>
    </NuxtLinkLocale>
    <div class="flex flex-1 flex-col gap-1.5 p-3.5">
      <p
        v-if="product.category"
        class="text-[11px] font-semibold tracking-wide text-black/50 uppercase dark:text-white/50"
      >
        {{ product.category.name }}
      </p>
      <NuxtLinkLocale
        :to="`/shop/${product.slug}`"
        class="line-clamp-2 text-sm font-bold group-hover:text-brand-700 dark:group-hover:text-brand-400"
      >
        {{ product.name }}
      </NuxtLinkLocale>
      <ShopPrice
        class="mt-auto"
        :price="product.priceMin"
        :price-max="product.priceMax"
        :compare-at="product.compareAtPrice"
        size="sm"
      />
    </div>
  </article>
</template>
