<script setup lang="ts">
// Auto-imported as <UiConfirmDialog />. Mounted once in app.vue and driven by
// `useConfirm()` — never rendered directly by feature code.
const { state, settle } = useConfirm()
const { t } = useI18n()
</script>

<template>
  <UiModal
    :open="state.open"
    labelledby="confirm-dialog-title"
    @close="settle(false)"
  >
    <h2
      id="confirm-dialog-title"
      class="text-lg font-semibold text-neutral-900 dark:text-white"
    >
      {{ state.title }}
    </h2>
    <p
      v-if="state.message"
      class="mt-2 text-sm text-neutral-600 dark:text-neutral-300"
    >
      {{ state.message }}
    </p>
    <div
      v-if="state.input"
      class="mt-4"
    >
      <label
        for="confirm-dialog-input"
        class="mb-1.5 block text-xs font-bold"
      >{{ state.input.label }}</label>
      <textarea
        id="confirm-dialog-input"
        v-model="state.inputValue"
        rows="2"
        :maxlength="state.input.maxLength"
        :placeholder="state.input.placeholder"
        class="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm text-black outline-none focus:border-brand-500 dark:border-white/10 dark:bg-white/5 dark:text-white"
      />
    </div>
    <div class="mt-6 flex justify-end gap-2">
      <UiButton
        variant="ghost"
        @click="settle(false)"
      >
        {{ state.cancelLabel ?? t('ui.confirm.cancel') }}
      </UiButton>
      <UiButton
        :class="state.tone === 'danger' ? 'bg-red-600! text-white! hover:bg-red-700!' : ''"
        @click="settle(true)"
      >
        {{ state.confirmLabel ?? t('ui.confirm.confirm') }}
      </UiButton>
    </div>
  </UiModal>
</template>
