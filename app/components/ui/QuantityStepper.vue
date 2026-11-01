<script setup lang="ts">
// Auto-imported as <UiQuantityStepper />. − [n] + control for a quantity inside `[min, max]`; typing a number is
// allowed and pulled back into range when the field loses focus.
const props = withDefaults(
  defineProps<{
    id?: string
    min?: number
    max?: number
    disabled?: boolean
    size?: 'sm' | 'md'
  }>(),
  { id: undefined, min: 1, max: Number.POSITIVE_INFINITY, disabled: false, size: 'md' },
)

const model = defineModel<number>({ required: true })
const { t } = useI18n()

function set(value: number) {
  const next = Math.min(props.max, Math.max(props.min, Number.isFinite(value) ? Math.floor(value) : props.min))
  if (next !== model.value) model.value = next
}

function onInput(event: Event) {
  const value = Number((event.target as HTMLInputElement).value)
  if (Number.isFinite(value) && value >= props.min && value <= props.max) set(value)
}

function onBlur(event: Event) {
  const input = event.target as HTMLInputElement
  set(Number(input.value))
  input.value = String(model.value)
}

const buttonClass = computed(() => [
  'flex items-center justify-center text-black/70 transition hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-40 dark:text-white/70 dark:hover:bg-white/10',
  props.size === 'sm' ? 'h-8 w-8' : 'h-10 w-10',
])
</script>

<template>
  <div class="inline-flex items-center overflow-hidden rounded-xl border border-black/10 bg-white dark:border-white/10 dark:bg-white/5">
    <button
      type="button"
      :class="buttonClass"
      :disabled="disabled || model <= min"
      :aria-label="t('shop.quantity.decrease')"
      @click="set(model - 1)"
    >
      <span
        aria-hidden="true"
        class="text-lg leading-none"
      >−</span>
    </button>
    <input
      :id="id"
      :value="model"
      type="number"
      inputmode="numeric"
      :min="min"
      :max="Number.isFinite(max) ? max : undefined"
      :disabled="disabled"
      :aria-label="t('shop.quantity.label')"
      class="w-12 [appearance:textfield] bg-transparent text-center text-sm font-semibold outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      @input="onInput"
      @blur="onBlur"
    >
    <button
      type="button"
      :class="buttonClass"
      :disabled="disabled || model >= max"
      :aria-label="t('shop.quantity.increase')"
      @click="set(model + 1)"
    >
      <UiIcon
        name="plus"
        :size="14"
      />
    </button>
  </div>
</template>
