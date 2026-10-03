<script setup lang="ts">
// Auto-imported as <UiToastContainer />. Mounted once in app.vue.
const { toasts, dismiss } = useToast()
const { t } = useI18n()

const TONE_CLASS = {
  success: 'bg-emerald-600 text-white',
  error: 'bg-red-600 text-white',
  info: 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900',
} as const
</script>

<template>
  <div
    class="pointer-events-none fixed inset-x-0 bottom-20 z-[60] flex flex-col items-center gap-2 px-4 md:bottom-6"
    aria-live="polite"
  >
    <TransitionGroup name="toast">
      <div
        v-for="toast in toasts"
        :key="toast.id"
        role="status"
        :class="['pointer-events-auto flex max-w-md items-start gap-3 rounded-2xl px-4 py-3 text-sm font-medium shadow-lg', TONE_CLASS[toast.tone]]"
      >
        <span class="flex-1">{{ toast.message }}</span>
        <button
          v-if="toast.action"
          type="button"
          class="rounded px-1 font-bold underline"
          @click="toast.action.run(); dismiss(toast.id)"
        >
          {{ toast.action.label }}
        </button>
        <button
          type="button"
          class="-m-1 rounded p-1 opacity-70 hover:opacity-100"
          :aria-label="t('ui.toast.dismiss')"
          @click="dismiss(toast.id)"
        >
          &times;
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
@reference "~/assets/css/main.css";

.toast-enter-active,
.toast-leave-active {
  @apply transition-all duration-200;
}
.toast-enter-from,
.toast-leave-to {
  @apply translate-y-2 opacity-0;
}
</style>
