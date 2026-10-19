<script setup lang="ts">
import type { BlogPost } from '#shared/types/blog'

const { t, locale } = useI18n()
const { settings } = useSiteSettings()

const search = ref('')
const category = ref<string | null>(null)
const debouncedSearch = refDebounced(search, 300)

const list = await usePagedList<BlogPost>('/blog', {
  key: 'public-blog-posts',
  query: computed(() => ({
    category: category.value ?? undefined,
    q: debouncedSearch.value.trim() || undefined,
  })),
})

function formatDateLabel(dateStr: string | null): string {
  if (!dateStr) return ''
  return formatDate(dateStr, locale.value)
}

useSeoMeta({
  title: () => `${t('blog.seoTitle')} | ${settings.value.siteName ?? t('brand.name')}`,
  description: () => t('blog.seoDescription'),
})
useSchemaOrg([defineWebPage()])
</script>

<template>
  <div class="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
    <!-- Header -->
    <div class="mb-10 text-center">
      <span class="inline-block rounded-full bg-brand-50 px-3.5 py-1 text-xs font-semibold text-brand-700 dark:bg-brand-950/50 dark:text-brand-300">
        {{ t('blog.title') }}
      </span>
      <h1 class="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
        {{ t('blog.title') }}
      </h1>
      <p class="mx-auto mt-3 max-w-2xl text-base text-black/60 dark:text-white/60">
        {{ t('blog.subtitle') }}
      </p>

      <!-- Search Bar -->
      <div class="mx-auto mt-6 max-w-md">
        <UiInput
          v-model="search"
          icon="search"
          :placeholder="t('blog.searchPlaceholder')"
        />
      </div>
    </div>

    <!-- Posts Grid -->
    <div
      v-if="list.items.value.length > 0"
      class="grid gap-8 sm:grid-cols-2 lg:grid-cols-3"
    >
      <article
        v-for="post in list.items.value"
        :key="post.id"
        class="group flex flex-col justify-between overflow-hidden rounded-3xl border border-black/10 bg-white/70 shadow-sm backdrop-blur-xl transition hover:border-brand-500/50 hover:shadow-md dark:border-white/10 dark:bg-black/30 dark:hover:border-brand-500/50"
      >
        <div>
          <!-- Thumbnail -->
          <NuxtLinkLocale
            :to="`/blog/${post.slug}`"
            class="block aspect-[16/9] w-full overflow-hidden bg-black/5 dark:bg-white/5"
          >
            <NuxtImg
              v-if="post.featured_image_url"
              :src="post.featured_image_url"
              :alt="post.featured_image_alt || post.title"
              sizes="(min-width: 1024px) 384px, (min-width: 640px) 50vw, 100vw"
              class="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
            <div
              v-else
              class="flex h-full w-full items-center justify-center bg-gradient-to-br from-brand-500/10 to-brand-700/10 text-brand-600 dark:text-brand-400"
            >
              <UiIcon
                name="file"
                :size="36"
              />
            </div>
          </NuxtLinkLocale>

          <div class="p-6">
            <div class="flex items-center justify-between gap-2">
              <span
                v-if="post.category"
                class="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-semibold text-brand-700 dark:bg-brand-950/60 dark:text-brand-300"
              >
                {{ post.category }}
              </span>
              <span class="text-xs text-black/40 dark:text-white/40">
                {{ formatDateLabel(post.published_at) }}
              </span>
            </div>

            <NuxtLinkLocale
              :to="`/blog/${post.slug}`"
              class="mt-3 block"
            >
              <h2 class="font-display text-xl font-bold leading-snug transition-colors group-hover:text-brand-600 dark:group-hover:text-brand-400 line-clamp-2">
                {{ post.title }}
              </h2>
              <p
                v-if="post.excerpt"
                class="mt-2 text-sm leading-relaxed text-black/60 dark:text-white/60 line-clamp-3"
              >
                {{ post.excerpt }}
              </p>
            </NuxtLinkLocale>
          </div>
        </div>

        <div class="flex items-center justify-between border-t border-black/5 p-6 pt-4 dark:border-white/5">
          <span class="text-xs text-black/50 dark:text-white/50">
            {{ t('blog.byAuthor', { author: post.author_name || settings.siteName || t('brand.name') }) }}
          </span>

          <NuxtLinkLocale
            :to="`/blog/${post.slug}`"
            class="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 transition hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
          >
            <span>{{ t('blog.readMore') }}</span>
            <UiIcon
              name="arrow-right"
              :size="12"
            />
          </NuxtLinkLocale>
        </div>
      </article>
    </div>

    <!-- Empty State -->
    <div
      v-else
      class="rounded-3xl border border-dashed border-black/15 py-16 px-6 text-center dark:border-white/15"
    >
      <div class="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-50 text-brand-600 dark:bg-brand-950/50 dark:text-brand-300">
        <UiIcon
          name="file"
          :size="26"
        />
      </div>
      <h3 class="mt-4 font-display text-lg font-bold">
        {{ t('blog.noPosts') }}
      </h3>
      <p class="mx-auto mt-1 max-w-md text-sm text-black/60 dark:text-white/60">
        {{ t('blog.noPostsSub') }}
      </p>
    </div>

    <!-- Load More -->
    <div class="mt-10">
      <DashboardLoadMore
        :shown="list.items.value.length"
        :total="list.meta.value?.total ?? 0"
        :has-more="list.hasMore.value"
        :loading="list.loadingMore.value"
        :failed="list.loadMoreFailed.value"
        @more="list.loadMore()"
      />
    </div>
  </div>
</template>
