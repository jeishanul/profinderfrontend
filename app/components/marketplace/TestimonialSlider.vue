<script setup lang="ts">
import type { Testimonial } from '#shared/types/marketplace'

// Auto-imported as <MarketplaceTestimonialSlider />.
const props = defineProps<{
  testimonials: Testimonial[]
}>()

const { t } = useI18n()

const carousel = useCarousel(() => props.testimonials.length, { intervalMs: 5500 })
const active = computed<Testimonial | undefined>(() => props.testimonials[carousel.index.value])
</script>

<template>
  <section
    v-if="testimonials.length > 0"
    class="bg-brand-50 py-20 dark:bg-brand-700/10"
  >
    <div class="mx-auto max-w-3xl px-4 sm:px-6 lg:px-10">
      <h2 class="mb-11 text-center font-display text-3xl font-bold sm:text-4xl">
        {{ t('marketplace.testimonials.heading') }}
      </h2>

      <!-- Autoplay pause-on-hover/focus is a decorative enhancement — full
           manual control already exists via the dot controls below, so this
           region intentionally isn't given a fake interactive role. -->
      <!-- eslint-disable-next-line vuejs-accessibility/no-static-element-interactions -->
      <div
        v-if="active"
        role="region"
        class="rounded-3xl border border-black/10 bg-white/70 p-8 text-center shadow-xl shadow-black/5 backdrop-blur-xl dark:border-white/10 dark:bg-black/30 sm:p-12"
        :aria-label="t('marketplace.testimonials.heading')"
        @mouseenter="carousel.pause()"
        @mouseleave="carousel.resume()"
        @focusin="carousel.pause()"
        @focusout="carousel.resume()"
      >
        <NuxtImg
          v-if="active.avatarUrl"
          :src="active.avatarUrl"
          :alt="active.reviewerName"
          width="56"
          height="56"
          class="mx-auto mb-4 h-14 w-14 rounded-full object-cover"
        />
        <div
          class="mb-5 flex justify-center gap-1"
          role="img"
          :aria-label="t('ui.starInput.stars', { count: active.rating }, active.rating)"
        >
          <UiIcon
            v-for="n in active.rating"
            :key="n"
            name="star"
            filled
            :size="25"
            class="text-accent-600"
          />
        </div>
        <p class="mx-auto max-w-xl text-lg font-medium leading-relaxed">
          &ldquo;{{ active.quoteText }}&rdquo;
        </p>
        <p class="mt-6 font-bold">
          {{ active.reviewerName }}
        </p>
        <p
          v-if="active.reviewerRole"
          class="text-sm text-black/50 dark:text-white/50"
        >
          {{ active.reviewerRole }}
        </p>

        <div class="mt-7 flex justify-center gap-2">
          <button
            v-for="(testimonial, index) in testimonials"
            :key="testimonial.id"
            type="button"
            class="h-2 rounded-full transition-all"
            :class="index === carousel.index.value ? 'w-5 bg-brand-600' : 'w-2 bg-black/15 dark:bg-white/25'"
            :aria-label="t('marketplace.testimonials.goTo', { number: index + 1 })"
            @click="carousel.goTo(index)"
          />
        </div>
      </div>
    </div>
  </section>
</template>
