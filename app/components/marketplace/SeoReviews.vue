<script setup lang="ts">
import type { SeoReview } from '#shared/types/seo'

// Auto-imported as <MarketplaceSeoReviews />. Admin-curated per landing page in the SEO drawer.
defineProps<{
  reviews: SeoReview[]
}>()

const { t } = useI18n()
</script>

<template>
  <section
    v-if="reviews.length > 0"
    class="mb-12"
  >
    <h2 class="mb-4 font-display text-xl font-bold sm:text-2xl">
      {{ t('seo.reviews.heading') }}
    </h2>
    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <figure
        v-for="(review, index) in reviews"
        :key="index"
        class="flex flex-col rounded-3xl border border-black/10 bg-white/70 p-6 backdrop-blur-xl dark:border-white/10 dark:bg-black/30"
      >
        <div
          class="mb-3 flex gap-0.5"
          role="img"
          :aria-label="t('seo.reviews.stars', { count: review.rating })"
        >
          <UiIcon
            v-for="n in 5"
            :key="n"
            name="star"
            :filled="n <= review.rating"
            :size="18"
            :class="n <= review.rating ? 'text-accent-600' : 'text-black/20 dark:text-white/20'"
          />
        </div>
        <blockquote class="flex-1 text-sm leading-relaxed whitespace-pre-line text-black/80 dark:text-white/80">
          &ldquo;{{ review.quote_text }}&rdquo;
        </blockquote>
        <figcaption class="mt-5 flex items-center gap-3">
          <UiAvatar
            :name="review.reviewer_name"
            size-class="h-10 w-10 rounded-full"
            text-class="text-sm"
          />
          <div>
            <p class="text-sm font-bold">
              {{ review.reviewer_name }}
            </p>
            <p
              v-if="review.reviewer_role"
              class="text-xs text-black/50 dark:text-white/50"
            >
              {{ review.reviewer_role }}
            </p>
          </div>
        </figcaption>
      </figure>
    </div>
  </section>
</template>
