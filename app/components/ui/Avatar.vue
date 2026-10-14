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
  }>(),
  { src: null, sizeClass: 'h-8 w-8 rounded-full', textClass: 'text-xs' },
)

const { settings } = useSiteSettings()
const shownSrc = computed(() => props.src || settings.value.defaultAvatarUrl)
</script>

<template>
  <NuxtImg
    v-if="shownSrc"
    :src="shownSrc"
    :alt="name"
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
