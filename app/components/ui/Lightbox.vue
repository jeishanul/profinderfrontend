<script setup lang="ts">
// Auto-imported as <UiLightbox />. A full-screen photo viewer: Escape closes,
// the arrow keys (or the buttons) move between photos, a click on the dark
// backdrop closes. Same teleport target and scroll-lock contract as <UiModal>.
export interface LightboxPhoto {
  id: string
  url: string
}

const props = defineProps<{
  photos: LightboxPhoto[]
  /** Index of the photo to show; `null` keeps the viewer closed. */
  index: number | null
  label: string
}>()

const emit = defineEmits<{
  'close': []
  'update:index': [index: number]
}>()

const { t } = useI18n()
const dialogRef = useTemplateRef('dialogRef')

const isOpen = computed(() => props.index !== null && props.photos[props.index] !== undefined)
const current = computed(() => (props.index === null ? null : props.photos[props.index] ?? null))

function step(delta: number) {
  if (props.index === null) return
  const count = props.photos.length
  emit('update:index', (props.index + delta + count) % count)
}

watch(isOpen, (open) => {
  if (!import.meta.client) return
  document.body.style.overflow = open ? 'hidden' : ''
  if (open) nextTick(() => dialogRef.value?.focus())
})
onUnmounted(() => {
  if (import.meta.client) document.body.style.overflow = ''
})

useFocusTrap(dialogRef, isOpen)

onKeyStroke('Escape', () => isOpen.value && emit('close'))
onKeyStroke('ArrowRight', () => isOpen.value && step(1))
onKeyStroke('ArrowLeft', () => isOpen.value && step(-1))
</script>

<template>
  <Teleport to="#teleports">
    <div
      v-if="isOpen && current"
      ref="dialogRef"
      role="dialog"
      aria-modal="true"
      :aria-label="label"
      tabindex="-1"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 outline-none"
    >
      <!-- Decorative click-to-dismiss backdrop — Escape already closes for keyboard users. -->
      <!-- eslint-disable-next-line vuejs-accessibility/click-events-have-key-events, vuejs-accessibility/no-static-element-interactions -->
      <div
        class="absolute inset-0"
        @click="emit('close')"
      />
      <img
        :src="current.url"
        :alt="label"
        class="relative max-h-[85vh] max-w-full rounded-xl object-contain"
      >
      <button
        type="button"
        class="absolute top-4 right-4 flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25"
        :aria-label="t('ui.lightbox.close')"
        @click="emit('close')"
      >
        <UiIcon
          name="x"
          :size="20"
        />
      </button>
      <template v-if="photos.length > 1">
        <button
          type="button"
          class="absolute left-4 flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25"
          :aria-label="t('ui.lightbox.previous')"
          @click="step(-1)"
        >
          <UiIcon
            name="chevron-left"
            :size="20"
          />
        </button>
        <button
          type="button"
          class="absolute right-4 flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25"
          :aria-label="t('ui.lightbox.next')"
          @click="step(1)"
        >
          <UiIcon
            name="chevron-left"
            :size="20"
            class="rotate-180"
          />
        </button>
        <span class="absolute bottom-4 rounded-full bg-black/60 px-3 py-1 text-xs font-semibold text-white">
          {{ (index ?? 0) + 1 }} / {{ photos.length }}
        </span>
      </template>
    </div>
  </Teleport>
</template>
