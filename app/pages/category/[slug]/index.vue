<script setup lang="ts">
import type { CategorySeoResponse } from '#shared/types/seo'

// One component per category: moving between two landing pages rebuilds it, so head, schema and filters never go stale.
definePageMeta({ key: route => route.path })

const route = useRoute()
const { t } = useI18n()

const slug = String(route.params.slug || '')

const { data: seoData, error: seoError } = await useApi<CategorySeoResponse>(`/seo/category/${encodeURIComponent(slug)}`, {
  key: `seo-category-${slug}`,
})

if (seoError.value || !seoData.value) {
  const status = seoError.value?.statusCode ?? 404
  throw createError({
    statusCode: status,
    statusMessage: status === 404 ? t('errors.notFound') : t('errors.somethingWrong'),
    fatal: true,
  })
}
</script>

<template>
  <MarketplaceCategoryLanding
    v-if="seoData"
    :seo-data="seoData"
  />
</template>
