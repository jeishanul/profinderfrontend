<script setup lang="ts">
// Auto-imported as <UiBottomSheet />. The mobile-native counterpart to
// <UiModal> (same backdrop/scroll-lock/Escape-to-close contract, see
// Modal.vue) but docks to the bottom edge and slides up instead of scaling
// in from center — the 2026 pattern for filters/overflow menus/actions on
// mobile (see AppMoreMenu, the first consumer). Content is the default slot.
const props = withDefaults(
  defineProps<{
    open: boolean
    labelledby?: string
  }>(),
  { labelledby: undefined },
)

const emit = defineEmits<{
  close: []
}>()

const dialogRef = useTemplateRef('dialogRef')

watch(() => props.open, (isOpen) => {
  if (!import.meta.client) return
  document.body.style.overflow = isOpen ? 'hidden' : ''
  if (isOpen) nextTick(() => dialogRef.value?.focus())
})

onUnmounted(() => {
  if (import.meta.client) document.body.style.overflow = ''
})

onKeyStroke('Escape', () => {
  if (props.open) emit('close')
})
</script>

<template>
  <!-- `#teleports`, not `body` — see Modal.vue for why. -->
  <Teleport to="#teleports">
    <Transition name="ui-sheet">
      <div
        v-if="open"
        class="fixed inset-0 z-50 flex items-end justify-center"
      >
        <!-- Decorative click-to-dismiss backdrop — Escape (bound above)
             already gives keyboard users a way to close. -->
        <!-- eslint-disable-next-line vuejs-accessibility/click-events-have-key-events, vuejs-accessibility/no-static-element-interactions -->
        <div
          class="absolute inset-0 bg-black/45 backdrop-blur-sm"
          @click="emit('close')"
        />
        <div
          ref="dialogRef"
          role="dialog"
          aria-modal="true"
          :aria-labelledby="labelledby"
          tabindex="-1"
          class="relative flex max-h-[85vh] w-full max-w-[440px] flex-col overflow-hidden rounded-t-[28px] bg-white pb-safe shadow-2xl outline-none dark:bg-black"
        >
          <div class="flex shrink-0 justify-center pt-2.5 pb-1">
            <span class="h-1.5 w-10 rounded-full bg-black/15 dark:bg-white/20" />
          </div>
          <div class="min-h-0 flex-1 overflow-y-auto">
            <slot />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
@reference "~/assets/css/main.css";

.ui-sheet-enter-active,
.ui-sheet-leave-active {
  @apply transition-opacity duration-200;
}
.ui-sheet-enter-active > div:last-child,
.ui-sheet-leave-active > div:last-child {
  @apply transition-transform duration-[250ms] ease-out;
}
.ui-sheet-enter-from,
.ui-sheet-leave-to {
  @apply opacity-0;
}
.ui-sheet-enter-from > div:last-child,
.ui-sheet-leave-to > div:last-child {
  @apply translate-y-full;
}
</style>
