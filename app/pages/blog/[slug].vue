<script setup lang="ts">
import type { BlogPost } from '#shared/types/blog'

const route = useRoute()
const { t, locale } = useI18n()
const { settings } = useSiteSettings()

const slug = String(route.params.slug)
const { data: post, error } = await useApi<BlogPost>(`/blog/${slug}`, {
  key: `blog-post-${slug}`,
})

if (error.value || !post.value) {
  const status = apiErrorStatus(error.value) ?? 404
  throw createError({
    statusCode: status,
    statusMessage: status === 404 ? t('errors.notFound') : t('errors.somethingWrong'),
    fatal: true,
  })
}

const publishedLabel = computed(() => (post.value?.published_at ? formatDate(post.value.published_at, locale.value) : null))

useSeoMeta({
  title: () => `${post.value?.meta_title || post.value?.title} | ${settings.value.siteName ?? t('brand.name')}`,
  description: () => post.value?.meta_description || post.value?.excerpt || undefined,
})
useShareImage(post.value?.featured_image_url ?? null, 'MarketplaceSatori', {
  title: post.value?.title ?? '',
  eyebrow: post.value?.category ?? t('blog.title'),
})
useSchemaOrg([
  defineArticle({
    headline: post.value?.title,
    description: post.value?.excerpt ?? undefined,
    datePublished: post.value?.published_at ?? undefined,
    author: post.value?.author_name ? [{ name: post.value.author_name }] : undefined,
  }),
])
</script>

<template>
  <article
    v-if="post"
    class="mx-auto max-w-3xl px-4 py-12 sm:px-6"
  >
    <!-- Back to blog -->
    <div class="mb-6">
      <NuxtLinkLocale
        to="/blog"
        class="inline-flex items-center gap-2 text-sm font-semibold text-black/60 transition hover:text-black dark:text-white/60 dark:hover:text-white"
      >
        <UiIcon
          name="chevron-left"
          :size="15"
        />
        <span>{{ t('blog.backToBlog') }}</span>
      </NuxtLinkLocale>
    </div>

    <!-- Category & Date Header -->
    <div class="flex flex-wrap items-center gap-2.5">
      <span
        v-if="post.category"
        class="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 dark:bg-brand-950/60 dark:text-brand-300"
      >
        {{ post.category }}
      </span>
      <span
        v-if="publishedLabel"
        class="text-xs text-black/40 dark:text-white/40"
      >
        {{ t('blog.publishedOn', { date: publishedLabel }) }}
      </span>
    </div>

    <!-- Title -->
    <h1 class="mt-4 font-display text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
      {{ post.title }}
    </h1>

    <!-- Author byline -->
    <div class="mt-4 flex items-center gap-2 text-sm text-black/60 dark:text-white/60">
      <span>{{ t('blog.byAuthor', { author: post.author_name || (settings.siteName ? `${settings.siteName} Editorial` : t('brand.name')) }) }}</span>
    </div>

    <!-- Featured Image -->
    <div
      v-if="post.featured_image_url"
      class="my-8 overflow-hidden rounded-3xl"
    >
      <NuxtImg
        :src="post.featured_image_url"
        :alt="post.featured_image_alt || post.title"
        sizes="(min-width: 768px) 768px, 100vw"
        width="1200"
        height="630"
        class="aspect-[16/9] w-full object-cover"
      />
    </div>

    <!-- Excerpt Callout -->
    <p
      v-if="post.excerpt"
      class="my-6 text-lg font-medium leading-relaxed text-black/70 italic dark:text-white/70"
    >
      {{ post.excerpt }}
    </p>

    <!-- Article Content (sanitized HTML) -->
    <!-- eslint-disable vue/no-v-html -->
    <div
      class="mt-8 text-base leading-relaxed text-black/80 dark:text-white/80 [&_a]:text-brand-700 [&_a]:underline dark:[&_a]:text-brand-400 [&_blockquote]:border-l-4 [&_blockquote]:border-brand-500 [&_blockquote]:pl-4 [&_blockquote]:italic [&_h2]:mt-8 [&_h2]:mb-3 [&_img]:my-6 [&_img]:h-auto [&_img]:max-w-full [&_img]:rounded-2xl [&_h2]:text-2xl [&_h2]:font-bold [&_h3]:mt-6 [&_h3]:mb-2 [&_h3]:text-xl [&_h3]:font-bold [&_h4]:mt-4 [&_h4]:mb-2 [&_h4]:font-bold [&_li]:mb-1.5 [&_ol]:ml-6 [&_ol]:list-decimal [&_p]:mb-4 [&_ul]:ml-6 [&_ul]:list-disc"
      v-html="post.content"
    />
    <!-- eslint-enable vue/no-v-html -->

    <!-- Tags -->
    <div
      v-if="post.tags && post.tags.length > 0"
      class="mt-10 flex flex-wrap items-center gap-2 border-t border-black/10 pt-6 dark:border-white/10"
    >
      <span class="text-xs font-semibold text-black/50 dark:text-white/50">{{ t('blog.tags') }}:</span>
      <UiTag
        v-for="tag in post.tags"
        :key="tag"
        size="sm"
      >
        #{{ tag }}
      </UiTag>
    </div>

    <!-- Previous / Next Navigation -->
    <div
      v-if="post.previous || post.next"
      class="mt-12 grid gap-4 border-t border-black/10 pt-8 sm:grid-cols-2 dark:border-white/10"
    >
      <NuxtLinkLocale
        v-if="post.previous"
        :to="`/blog/${post.previous.slug}`"
        class="group flex flex-col rounded-2xl border border-black/10 p-5 transition hover:border-brand-500/50 dark:border-white/10 dark:hover:border-brand-500/50"
      >
        <span class="text-xs font-semibold text-black/40 group-hover:text-brand-600 dark:text-white/40 dark:group-hover:text-brand-400">
          &larr; {{ t('blog.previousPost') }}
        </span>
        <span class="mt-1 font-display text-sm font-bold text-gray-900 group-hover:text-brand-600 dark:text-white dark:group-hover:text-brand-400 line-clamp-1">
          {{ post.previous.title }}
        </span>
      </NuxtLinkLocale>
      <div v-else />

      <NuxtLinkLocale
        v-if="post.next"
        :to="`/blog/${post.next.slug}`"
        class="group flex flex-col text-right rounded-2xl border border-black/10 p-5 transition hover:border-brand-500/50 dark:border-white/10 dark:hover:border-brand-500/50"
      >
        <span class="text-xs font-semibold text-black/40 group-hover:text-brand-600 dark:text-white/40 dark:group-hover:text-brand-400">
          {{ t('blog.nextPost') }} &rarr;
        </span>
        <span class="mt-1 font-display text-sm font-bold text-gray-900 group-hover:text-brand-600 dark:text-white dark:group-hover:text-brand-400 line-clamp-1">
          {{ post.next.title }}
        </span>
      </NuxtLinkLocale>
    </div>
  </article>
</template>
