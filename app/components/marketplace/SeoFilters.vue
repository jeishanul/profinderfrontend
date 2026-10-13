<script setup lang="ts">
import { SEO_SORTS, type SeoSort } from '~/composables/useSeoProviderFilters'

defineProps<{
  placeholder: string
}>()

const search = defineModel<string>('search', { required: true })
const sort = defineModel<SeoSort>('sort', { required: true })
const { t } = useI18n()
</script>

<template>
  <div class="mt-6 flex flex-col gap-3 border-t border-black/5 pt-6 sm:flex-row sm:items-center dark:border-white/5">
    <UiInput
      v-model="search"
      icon="search"
      class="flex-1"
      :placeholder="placeholder"
      :aria-label="t('seo.filters.search')"
    />
    <select
      v-model="sort"
      :aria-label="t('seo.filters.sort')"
      class="rounded-xl border border-black/10 bg-white px-4 py-3 text-sm text-black outline-none focus:border-brand-500 dark:border-white/10 dark:bg-white/5 dark:text-white"
    >
      <option
        v-for="option in SEO_SORTS"
        :key="option"
        :value="option"
      >
        {{ t(`marketplace.browse.sort.${option}`) }}
      </option>
    </select>
  </div>
</template>
