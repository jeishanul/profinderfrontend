<script setup lang="ts">
// Auto-imported as <UiAvatar />. The person's uploaded photo when they have
// one, else the site's default profile photo if the admin set one (Settings),
// else their initials on the brand colour.
const props = withDefaults(
  defineProps<{
    name: string
    src?: string | null
    /** Tailwind size + radius classes, e.g. `h-8 w-8 rounded-full`. */
    sizeClass?: string
    textClass?: string
    /** Displayed size in CSS pixels, when `sizeClass` doesn't say (e.g. `h-full`). Read from `sizeClass` otherwise. */
    px?: number
    /** Above the fold (header, a profile's own photo): load at once instead of when scrolled near. */
    eager?: boolean
  }>(),
  { src: null, sizeClass: 'h-8 w-8 rounded-full', textClass: 'text-xs', px: undefined, eager: false },
)

const { settings } = useSiteSettings()
const shownSrc = computed(() => props.src || settings.value.defaultAvatarUrl)
// Requested at the size it's shown (1x and 2x), not the uploaded original: a card's 76 px avatar was a full photo.
const pixels = computed(() => props.px ?? avatarPixels(props.sizeClass))
</script>

<template>
  <NuxtImg
    v-if="shownSrc"
    :src="shownSrc"
    :alt="name"
    :width="pixels"
    :height="pixels"
    densities="x1 x2"
    :loading="eager ? 'eager' : 'lazy'"
    decoding="async"
    class="shrink-0 object-cover"
    :class="sizeClass"
  />
  <span
    v-else
    class="flex shrink-0 items-center justify-center bg-brand-600 font-display font-bold text-white"
    :class="[sizeClass, textClass]"
    :aria-label="name"
  >{{ initialsFor(name) }}</span>
</template>
