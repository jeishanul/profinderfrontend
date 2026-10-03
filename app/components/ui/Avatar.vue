<script setup lang="ts">
// Auto-imported as <UiAvatar />. The person's uploaded photo when they have
// one, else their initials on the brand colour. Menus and headers used to show
// initials only, even after a photo was uploaded.
withDefaults(
  defineProps<{
    name: string
    src?: string | null
    /** Tailwind size + radius classes, e.g. `h-8 w-8 rounded-full`. */
    sizeClass?: string
    textClass?: string
  }>(),
  { src: null, sizeClass: 'h-8 w-8 rounded-full', textClass: 'text-xs' },
)
</script>

<template>
  <NuxtImg
    v-if="src"
    :src="src"
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
