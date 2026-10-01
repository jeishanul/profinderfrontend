<script setup lang="ts">
// Auto-imported as <UiToggleSwitch/>. Generic on/off switch — used by the
// settings page's security and notification-preference rows.
const props = withDefaults(
  defineProps<{
    label?: string
    disabled?: boolean
  }>(),
  { label: undefined, disabled: false },
)

const model = defineModel<boolean>({ default: false })

function toggle() {
  if (props.disabled) return
  model.value = !model.value
}
</script>

<template>
  <button
    type="button"
    role="switch"
    :aria-checked="model"
    :aria-label="props.label"
    :aria-disabled="props.disabled || undefined"
    :disabled="props.disabled"
    class="relative h-6 w-[42px] shrink-0 rounded-full p-0.5 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
    :class="model ? 'bg-brand-600' : 'bg-black/10 dark:bg-white/15'"
    @click="toggle"
  >
    <span
      class="block h-5 w-5 rounded-full bg-white transition-transform"
      :class="model ? 'translate-x-[18px]' : 'translate-x-0'"
    />
  </button>
</template>
