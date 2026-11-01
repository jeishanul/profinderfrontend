<script setup lang="ts">
import type { ShopCartLine } from '#shared/types/shop'

// Auto-imported as <ShopCartLine/>. One line of the cart (editable: quantity stepper + remove) or of the checkout
// summary (read-only). Shows what is wrong with the line, if anything.
const props = withDefaults(
  defineProps<{
    line: ShopCartLine
    editable?: boolean
    busy?: boolean
  }>(),
  { editable: false, busy: false },
)

const emit = defineEmits<{
  quantity: [sku: string, quantity: number]
  remove: [sku: string]
}>()

const { t } = useI18n()
const { money } = useSiteSettings()

const bounds = computed(() => quantityBounds(props.line))
const quantity = computed({
  get: () => props.line.quantity,
  set: value => emit('quantity', props.line.sku, value),
})

const issueText = computed(() => {
  const issue = props.line.issue
  if (!issue) return null
  return t(`shop.cart.issues.${issue}`, { min: props.line.minQty, max: props.line.maxQty ?? '', available: props.line.available ?? 0 })
})

// A line whose SKU no longer exists has no product page to go back to.
const productPath = computed(() => (props.line.productSlug ? `/shop/${props.line.productSlug}` : '/shop'))
</script>

<template>
  <div class="flex gap-3.5 py-4">
    <NuxtLinkLocale
      :to="productPath"
      class="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-black/5 dark:bg-white/5"
    >
      <NuxtImg
        v-if="line.imageUrl"
        :src="line.imageUrl"
        :alt="line.productName"
        width="80"
        height="80"
        class="h-full w-full object-cover"
      />
      <UiPlaceholderMedia
        v-else
        icon="bag"
        class="h-full w-full"
      />
    </NuxtLinkLocale>
    <div class="min-w-0 flex-1">
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0">
          <NuxtLinkLocale
            :to="productPath"
            class="line-clamp-2 text-sm font-bold hover:text-brand-700 dark:hover:text-brand-400"
          >
            {{ line.productName }}
          </NuxtLinkLocale>
          <p
            v-if="line.variantLabel"
            class="mt-0.5 text-xs text-black/60 dark:text-white/60"
          >
            {{ line.variantLabel }}
          </p>
          <p class="mt-0.5 text-xs text-black/50 dark:text-white/50">
            {{ money(line.unitPrice) }}<span v-if="!editable"> × {{ line.quantity }}</span>
          </p>
        </div>
        <span class="shrink-0 text-sm font-bold">{{ money(line.lineTotal) }}</span>
      </div>

      <div
        v-if="editable"
        class="mt-2.5 flex items-center gap-3"
      >
        <UiQuantityStepper
          v-model="quantity"
          size="sm"
          :min="bounds.min"
          :max="Math.max(bounds.min, bounds.max, line.quantity)"
          :disabled="busy || line.issue === 'unavailable' || line.issue === 'out_of_stock'"
        />
        <button
          type="button"
          class="text-xs font-semibold text-black/50 hover:text-red-600 dark:text-white/50 dark:hover:text-red-400"
          :disabled="busy"
          :aria-label="t('shop.cart.removeItem', { name: line.productName })"
          @click="emit('remove', line.sku)"
        >
          {{ t('shop.cart.remove') }}
        </button>
      </div>

      <p
        v-if="issueText"
        role="alert"
        class="mt-2 text-xs font-semibold text-red-700 dark:text-red-300"
      >
        {{ issueText }}
      </p>
    </div>
  </div>
</template>
