<script setup lang="ts">
// Auto-imported as <UiCheckMark/>. The decorative checkbox square for rows that act as checkboxes (buttons or links);
// the row itself carries the state for assistive tech (`aria-pressed` / `aria-current`).
defineProps<{ checked: boolean }>()
</script>

<template>
  <span
    class="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px] border transition-colors"
    :class="checked ? 'border-brand-600 bg-brand-600' : 'border-black/20 dark:border-white/25'"
    aria-hidden="true"
  >
    <UiIcon
      v-if="checked"
      name="check"
      :size="11"
      class="text-white"
    />
  </span>
</template>
