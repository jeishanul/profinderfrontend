<script setup lang="ts">
import QRCode from 'qrcode'

// Auto-imported as <UiQrCode />. A real, scannable QR code for `value`
// (drawn as one SVG path — built synchronously, so it also renders in SSR).
// With no value there is nothing to encode, so it renders nothing rather than
// a decorative look-alike that wouldn't scan.
const props = withDefaults(
  defineProps<{
    value?: string | null
    size?: number
    label?: string
  }>(),
  { value: null, size: 64, label: undefined },
)

const modules = computed(() => {
  if (!props.value) return null
  const qr = QRCode.create(props.value, { errorCorrectionLevel: 'M' })
  return { size: qr.modules.size, data: qr.modules.data as ArrayLike<number> }
})

// One tiny square per dark module, merged into a single path.
const path = computed(() => {
  if (!modules.value) return ''
  const { size, data } = modules.value
  let d = ''
  for (let i = 0; i < size * size; i++) {
    if (data[i]) d += `M${i % size},${Math.floor(i / size)}h1v1h-1z`
  }
  return d
})
</script>

<template>
  <div
    v-if="modules"
    class="shrink-0 rounded-xl border border-black/10 bg-white p-1.5 dark:border-white/10"
    :style="{ width: `${size}px`, height: `${size}px` }"
  >
    <svg
      :viewBox="`0 0 ${modules.size} ${modules.size}`"
      shape-rendering="crispEdges"
      role="img"
      :aria-label="label"
      class="h-full w-full"
    >
      <path
        :d="path"
        fill="#000"
      />
    </svg>
  </div>
</template>
