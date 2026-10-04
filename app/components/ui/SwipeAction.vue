<script setup lang="ts">
export interface SwipeActionItem {
  label: string
  icon: IconName
  /** `danger` (red, destructive) or `neutral` (dark, anything else) — defaults to `neutral`. */
  tone?: 'danger' | 'neutral'
  onAction: () => void
}

// Auto-imported as <UiSwipeAction />. Wraps one list row so a left swipe
// reveals one or more action buttons behind it (iOS Mail-style) — the native
// mobile pattern for row actions (see CLAUDE.md's mobile redesign notes).
// Desktop/mouse users still get the action: revealing needs a real swipe,
// but a released mouse-drag past the threshold reveals it the same way
// (`usePointerSwipe` listens to mouse pointers too), and each panel button
// stays reachable by keyboard once revealed (a real `<button>`, not just a `div`).
const props = defineProps<{
  actions: SwipeActionItem[]
}>()

const TONE_CLASS: Record<NonNullable<SwipeActionItem['tone']>, string> = {
  danger: 'bg-red-600',
  neutral: 'bg-black/70 dark:bg-white/20',
}

const ACTION_WIDTH = 84
const REVEAL_WIDTH = computed(() => ACTION_WIDTH * props.actions.length)
const CLICK_SUPPRESS_THRESHOLD = 8

const rowRef = useTemplateRef('rowRef')
const isOpen = ref(false)
// A drag that moved enough to count as a swipe must not also fire the
// wrapped row's own click (it would otherwise both reveal/hide the action
// AND navigate/select) — tracked across the gesture, consumed by the very
// next click (capture-phase, so it never reaches the slotted content).
let draggedPastThreshold = false

const { distanceX, isSwiping } = usePointerSwipe(rowRef, {
  threshold: 8,
  onSwipeStart: () => {
    draggedPastThreshold = false
  },
  onSwipe: () => {
    if (Math.abs(distanceX.value) > CLICK_SUPPRESS_THRESHOLD) draggedPastThreshold = true
  },
  onSwipeEnd: (_event, direction) => {
    if (direction === 'left') isOpen.value = true
    else if (direction === 'right') isOpen.value = false
  },
})

const translateX = computed(() => {
  const base = isOpen.value ? -REVEAL_WIDTH.value : 0
  if (!isSwiping.value) return base
  return Math.max(-REVEAL_WIDTH.value, Math.min(0, base - distanceX.value))
})

function handleAction(action: SwipeActionItem) {
  isOpen.value = false
  action.onAction()
}

// Capture phase — runs before the slotted row's own @click, so it never
// reaches it in either case below (both would otherwise wrongly navigate).
function handleRowClickCapture(event: MouseEvent) {
  if (draggedPastThreshold) {
    // The click that always follows a mouseup/touchend after a real swipe —
    // swallow it, but leave `isOpen` exactly as `onSwipeEnd` just set it
    // (don't re-close what the swipe just opened).
    event.stopPropagation()
    event.preventDefault()
    draggedPastThreshold = false
    return
  }
  if (isOpen.value) {
    // A plain tap landing on the still-revealed sliver — close it instead
    // of navigating; a second, separate tap is what activates the row.
    event.stopPropagation()
    event.preventDefault()
    isOpen.value = false
  }
}
</script>

<template>
  <!-- No clipping/rounding on this outer wrapper — each visible layer below
       rounds and clips ITSELF instead. Sharing one `overflow-hidden` clip
       between a static rectangle (the panel) and a `transform`-composited
       sibling (the row) left a hairline gap at the curve in every browser
       tested (a GPU compositing seam, not a layout bug) — self-clipping
       avoids the two curves ever needing to line up. -->
  <div class="relative">
    <div
      class="absolute inset-y-0 right-0 flex items-stretch overflow-hidden rounded-r-xl"
      :style="{ width: `${REVEAL_WIDTH}px` }"
    >
      <button
        v-for="action in actions"
        :key="action.label"
        type="button"
        class="flex flex-1 flex-col items-center justify-center gap-1 text-white active:scale-95"
        :class="TONE_CLASS[action.tone ?? 'neutral']"
        :aria-label="action.label"
        @click="handleAction(action)"
      >
        <UiIcon
          :name="action.icon"
          :size="17"
        />
        <span class="text-[10px] font-semibold">{{ action.label }}</span>
      </button>
    </div>
    <!-- Not a new interactive control — a capture-phase guard that only
         ever suppresses the slotted row's own click after a swipe; that
         slotted content (a real button/link) keeps its own keyboard access
         untouched. Same reasoning as the backdrop click in `UiModal.vue`. -->
    <!-- eslint-disable-next-line vuejs-accessibility/click-events-have-key-events, vuejs-accessibility/no-static-element-interactions -->
    <div
      ref="rowRef"
      class="relative touch-pan-y overflow-hidden rounded-xl bg-white transition-transform duration-200 ease-out dark:bg-black"
      :class="{ 'duration-0!': isSwiping }"
      :style="{ transform: `translateX(${translateX}px)` }"
      @click.capture="handleRowClickCapture"
    >
      <slot />
    </div>
  </div>
</template>
