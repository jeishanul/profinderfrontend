<script setup lang="ts">
// Auto-imported as <UiCollapsibleSection />. Mobile-only accordion chrome for
// a long form/settings page (Profile's Basic info/Skills/Rate/Recent work) —
// collapsing sections keeps the initial scroll short instead of dumping the
// whole form on screen at once, the same "grouped, tappable, not everything
// expanded" instinct behind the mobile Settings redesign. Forced open at
// `sm:` and up regardless of `defaultOpen`/toggling — desktop keeps every
// section expanded, unchanged from before this component existed.
const props = withDefaults(
  defineProps<{
    title: string
    defaultOpen?: boolean
  }>(),
  { defaultOpen: false },
)

const isOpen = ref(props.defaultOpen)
</script>

<template>
  <div class="rounded-2xl border border-black/10 dark:border-white/10">
    <button
      type="button"
      class="flex w-full items-center justify-between gap-3 p-5 text-left sm:cursor-default sm:pointer-events-none sm:p-6 sm:pb-0"
      :aria-expanded="isOpen"
      @click="isOpen = !isOpen"
    >
      <h2 class="font-display text-[15px] font-bold">
        {{ title }}
      </h2>
      <UiIcon
        name="chevron-down"
        :size="16"
        class="shrink-0 text-black/40 transition-transform sm:hidden dark:text-white/40"
        :class="{ 'rotate-180': isOpen }"
      />
    </button>
    <div
      class="px-5 pb-5 sm:block! sm:p-6"
      :class="isOpen ? 'block' : 'hidden'"
    >
      <slot />
    </div>
  </div>
</template>
