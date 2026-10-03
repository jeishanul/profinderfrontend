<script setup lang="ts">
// Auto-imported as <UiStarInput />. A 1-5 star picker (radio group): click or
// tap a star, or use the arrow keys / Home / End once it has focus. Distinct
// from <UiRating> which only *displays* a rating.
const props = withDefaults(
  defineProps<{
    label: string
    disabled?: boolean
  }>(),
  { disabled: false },
)

const model = defineModel<number>({ default: 0 })

const { t } = useI18n()
const hovered = ref(0)
const STARS = [1, 2, 3, 4, 5] as const

const shown = computed(() => hovered.value || model.value)

function onKeydown(event: KeyboardEvent) {
  if (props.disabled) return
  const step = event.key === 'ArrowRight' || event.key === 'ArrowUp' ? 1 : event.key === 'ArrowLeft' || event.key === 'ArrowDown' ? -1 : 0
  if (step !== 0) {
    event.preventDefault()
    model.value = Math.min(5, Math.max(1, (model.value || 0) + step))
  }
  else if (event.key === 'Home') {
    event.preventDefault()
    model.value = 1
  }
  else if (event.key === 'End') {
    event.preventDefault()
    model.value = 5
  }
}
</script>

<template>
  <div
    role="radiogroup"
    :aria-label="label"
    tabindex="-1"
    class="inline-flex items-center gap-1"
    @mouseleave="hovered = 0"
    @focusout="hovered = 0"
  >
    <button
      v-for="star in STARS"
      :key="star"
      type="button"
      role="radio"
      :aria-checked="model === star"
      :aria-label="t('ui.starInput.stars', { count: star }, star)"
      :tabindex="model === star || (model === 0 && star === 1) ? 0 : -1"
      :disabled="disabled"
      class="rounded p-0.5 transition-transform hover:scale-110 focus-visible:outline-2 focus-visible:outline-brand-600 disabled:opacity-50"
      @click="model = star"
      @mouseenter="hovered = star"
      @focusin="hovered = star"
      @keydown="onKeydown"
    >
      <UiIcon
        name="star"
        :filled="star <= shown"
        :size="28"
        :class="star <= shown ? 'text-accent-600' : 'text-black/25 dark:text-white/25'"
      />
    </button>
  </div>
</template>
