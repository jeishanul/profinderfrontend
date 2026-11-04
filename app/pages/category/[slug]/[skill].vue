<script setup lang="ts">
import type { SkillSeoResponse } from '#shared/types/seo'

// A sub-category's landing page (/category/{category}/{skill}). Keyed by path, like the category page.
definePageMeta({ key: route => route.path })

const route = useRoute()
const { t } = useI18n()

const slug = String(route.params.slug || '')
const skill = String(route.params.skill || '')

const { data: seoData, error: seoError } = await useApi<SkillSeoResponse>(
  `/seo/category/${encodeURIComponent(slug)}/${encodeURIComponent(skill)}`,
  { key: `seo-skill-${slug}-${skill}` },
)

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
