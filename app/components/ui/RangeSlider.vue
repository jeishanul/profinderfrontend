<script setup lang="ts">
// Auto-imported as <UiRangeSlider />. A dual-handle range slider built from
// two overlapping native `<input type="range">` elements — each is fully
// keyboard-operable (arrow keys, Home/End) on its own, and the scoped style
// below makes only their thumbs (not the full-width track) receive pointer
// events, so the two overlapping tracks don't fight each other for clicks.
const props = withDefaults(
  defineProps<{
    min: number
    max: number
    step?: number
    labelFrom?: string
    labelTo?: string
  }>(),
  { step: 1, labelFrom: undefined, labelTo: undefined },
)

const from = defineModel<number>('from', { required: true })
const to = defineModel<number>('to', { required: true })

// Handles can't cross — dragging one past the other pushes it along instead.
watch(from, (value) => {
  if (value > to.value) to.value = value
})
watch(to, (value) => {
  if (value < from.value) from.value = value
})

function percentOf(value: number): number {
  if (props.max === props.min) return 0
  return Math.min(100, Math.max(0, ((value - props.min) / (props.max - props.min)) * 100))
}

const fromPercent = computed(() => percentOf(from.value))
const toPercent = computed(() => percentOf(to.value))
</script>

<template>
  <div class="relative h-7 w-full">
    <div class="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-black/10 dark:bg-white/15" />
    <div
      class="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-brand-600"
      :style="{ left: `${fromPercent}%`, right: `${100 - toPercent}%` }"
    />
    <input
      v-model.number="from"
      type="range"
      :min="min"
      :max="max"
      :step="step"
      class="range-input"
      :aria-label="labelFrom"
    >
    <input
      v-model.number="to"
      type="range"
      :min="min"
      :max="max"
      :step="step"
      class="range-input"
      :aria-label="labelTo"
    >
  </div>
</template>

<style scoped>
@reference "~/assets/css/main.css";

.range-input {
  @apply pointer-events-none absolute inset-x-0 top-1/2 m-0 h-7 w-full -translate-y-1/2 appearance-none bg-transparent;
}
.range-input::-webkit-slider-runnable-track {
  @apply appearance-none bg-transparent;
}
.range-input::-moz-range-track {
  @apply appearance-none bg-transparent;
}
/* 28px, not the 20px this started at — a thumb you actually drag with a
   fingertip instead of a mouse pointer wants to read closer to a native
   slider's touch target than a desktop-scrollbar-style handle. */
.range-input::-webkit-slider-thumb {
  @apply pointer-events-auto h-7 w-7 cursor-pointer appearance-none rounded-full border-[3px] border-brand-600 bg-white shadow-md;
}
.range-input::-moz-range-thumb {
  @apply pointer-events-auto h-7 w-7 cursor-pointer rounded-full border-[3px] border-brand-600 bg-white shadow-md;
}
</style>
