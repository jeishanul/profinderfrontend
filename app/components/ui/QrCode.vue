<script setup lang="ts">
// Auto-imported as <UiQrCode />. A real, scannable QR code for `value`, drawn on the server (`/api/qr`, see
// `server/utils/qrSvg.ts`) and shown as an image: the browser never downloads the QR encoder, and pages don't
// re-encode it on every render. A plain <img>, not <NuxtImg>: it is already an SVG at any size, nothing to resize.
// With no value there is nothing to encode, so it renders nothing rather than a decorative look-alike that wouldn't scan.
const props = withDefaults(
  defineProps<{
    value?: string | null
    size?: number
    label?: string
  }>(),
  { value: null, size: 64, label: undefined },
)

const src = computed(() => (props.value ? `/api/qr?value=${encodeURIComponent(props.value)}` : null))
// The frame has 6px of padding on each side (`p-1.5`).
const imageSize = computed(() => props.size - 12)
</script>

<template>
  <div
    v-if="src"
    class="shrink-0 rounded-xl border border-black/10 bg-white p-1.5 dark:border-white/10"
    :style="{ width: `${size}px`, height: `${size}px` }"
  >
    <img
      :src="src"
      :alt="label ?? ''"
      :width="imageSize"
      :height="imageSize"
      loading="lazy"
      decoding="async"
      class="h-full w-full"
    >
  </div>
</template>
