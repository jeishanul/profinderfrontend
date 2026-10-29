<script setup lang="ts">
import type { ShopCategory } from '#shared/types/shop'

// Auto-imported as <ShopCategoryTree/>. The category sidebar of the storefront (up to three levels), rendering
// itself for the children. The branch holding the current category is open; the rest stay folded.
const props = withDefaults(
  defineProps<{
    categories: ShopCategory[]
    active?: string | null
    depth?: number
  }>(),
  { active: null, depth: 0 },
)

function contains(category: ShopCategory, slug: string | null): boolean {
  if (!slug) return false
  return category.slug === slug || category.children.some(child => contains(child, slug))
}

const linkClass = (category: ShopCategory) => [
  'flex items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-sm transition-colors',
  category.slug === props.active
    ? 'bg-brand-50 font-semibold text-brand-700 dark:bg-brand-700/20 dark:text-brand-100'
    : 'text-black/70 hover:bg-black/5 hover:text-black dark:text-white/70 dark:hover:bg-white/10 dark:hover:text-white',
]
</script>

<template>
  <ul :class="depth > 0 ? 'mt-0.5 ml-3 border-l border-black/10 pl-2 dark:border-white/10' : 'space-y-0.5'">
    <li
      v-for="category in categories"
      :key="category.slug"
    >
      <NuxtLinkLocale
        :to="`/shop/category/${category.slug}`"
        :class="linkClass(category)"
        :aria-current="category.slug === active ? 'page' : undefined"
      >
        <span class="truncate">{{ category.name }}</span>
        <span class="shrink-0 text-xs text-black/40 dark:text-white/40">{{ category.productCount }}</span>
      </NuxtLinkLocale>
      <ShopCategoryTree
        v-if="category.children.length > 0 && contains(category, active)"
        :categories="category.children"
        :active="active"
        :depth="depth + 1"
      />
    </li>
  </ul>
</template>
