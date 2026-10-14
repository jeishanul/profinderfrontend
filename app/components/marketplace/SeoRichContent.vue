<script setup lang="ts">
defineProps<{
  content: string | null | undefined
  heading?: string
}>()
</script>

<template>
  <div
    v-if="content && content.trim()"
    class="rounded-3xl border border-black/10 bg-white/60 p-6 shadow-xs backdrop-blur-xl sm:p-8 dark:border-white/10 dark:bg-black/20"
  >
    <h2
      v-if="heading"
      class="mb-4 font-display text-xl font-bold sm:text-2xl"
    >
      {{ heading }}
    </h2>
    <UiRichText :html="content" />
  </div>
</template>
