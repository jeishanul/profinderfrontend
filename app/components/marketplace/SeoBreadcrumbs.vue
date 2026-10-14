<script setup lang="ts">
import type { BreadcrumbItem } from '#shared/types/seo'

defineProps<{
  items: BreadcrumbItem[]
}>()
</script>

<template>
  <nav
    v-if="items.length > 0"
    aria-label="Breadcrumb"
    class="mb-6 flex flex-wrap items-center gap-1.5 text-xs text-black/60 sm:text-sm dark:text-white/60"
  >
    <ol class="flex flex-wrap items-center gap-1.5">
      <li
        v-for="(item, index) in items"
        :key="item.url"
        class="flex items-center gap-1.5"
      >
        <template v-if="index < items.length - 1">
          <NuxtLinkLocale
            :to="item.url"
            class="transition-colors hover:text-brand-600 dark:hover:text-brand-400"
          >
            {{ item.label }}
          </NuxtLinkLocale>
          <UiIcon
            name="chevron-right"
            :size="12"
            class="text-black/30 dark:text-white/30"
          />
        </template>
        <span
          v-else
          aria-current="page"
          class="font-semibold text-black dark:text-white"
        >
          {{ item.label }}
        </span>
      </li>
    </ol>
  </nav>
</template>
