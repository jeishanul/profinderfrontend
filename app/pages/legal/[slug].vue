<script setup lang="ts">
import type { StaticPageContent } from '#shared/types/marketplace'

// Terms, Privacy, About, Contact… — the admin's "Pages". Content is plain HTML
// the backend has already run through an allowlist sanitiser (script, event
// handlers and unsafe links are stripped on save *and* on the way out), which
// is what makes rendering it with `v-html` safe here.
const route = useRoute()
const { t } = useI18n()

const slug = String(route.params.slug)
const { data: page, error } = await useApi<StaticPageContent>(`/pages/${slug}`, { key: `page-${slug}` })

if (error.value || !page.value) {
  const status = apiErrorStatus(error.value) ?? 404
  throw createError({
    statusCode: status,
    statusMessage: status === 404 ? t('legal.notFound') : t('errors.somethingWrong'),
    fatal: true,
  })
}

useSeoMeta({
  title: page.value.metaTitle ?? page.value.title,
  description: page.value.metaDescription ?? undefined,
})
defineOgImage('MarketplaceSatori', {
  title: page.value.title,
  eyebrow: t('legal.eyebrow'),
})
useSchemaOrg([defineWebPage({ name: page.value.title })])

const { locale } = useI18n()
const updatedLabel = computed(() => (page.value?.updatedAt ? formatDate(page.value.updatedAt, locale.value) : null))
</script>

<template>
  <article
    v-if="page"
    class="mx-auto max-w-3xl px-4 py-12 sm:px-6"
  >
    <h1 class="font-display text-3xl font-bold sm:text-4xl">
      {{ page.title }}
    </h1>
    <p
      v-if="updatedLabel"
      class="mt-2 text-sm text-black/50 dark:text-white/50"
    >
      {{ t('legal.lastUpdated', { date: updatedLabel }) }}
    </p>
    <!-- eslint-disable vue/no-v-html -->
    <div
      class="mt-8 text-black/75 dark:text-white/75 [&_a]:text-brand-700 [&_a]:underline dark:[&_a]:text-brand-500 [&_blockquote]:border-l-4 [&_blockquote]:border-black/15 [&_blockquote]:pl-4 [&_blockquote]:italic [&_h2]:mt-8 [&_h2]:mb-3 [&_h2]:text-2xl [&_h2]:font-bold [&_h3]:mt-6 [&_h3]:mb-2 [&_h3]:text-xl [&_h3]:font-bold [&_h4]:mt-4 [&_h4]:mb-2 [&_h4]:font-bold [&_li]:mb-1.5 [&_ol]:ml-6 [&_ol]:list-decimal [&_p]:mb-4 [&_ul]:ml-6 [&_ul]:list-disc"
      v-html="page.content"
    />
    <!-- eslint-enable vue/no-v-html -->
  </article>
</template>
