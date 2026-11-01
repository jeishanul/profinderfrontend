<script setup lang="ts">
import type { ShopProduct } from '#shared/types/shop'

// A product: gallery, variant picker, quantity and Add to cart / Buy now. Guests can add to the cart (kept in their
// browser); Buy now goes straight to checkout, after logging in.
definePageMeta({ key: route => route.path })

const route = useRoute()
const { t } = useI18n()
const { settings, money } = useSiteSettings()
const toast = useToast()
const session = useSession()
const authModal = useAuthModal()
const localePath = useLocalePath()
const cart = useShopCart()

const slug = String(route.params.slug)
const { data: response, error } = await useApi<{ data: ShopProduct }>(`/shop/products/${encodeURIComponent(slug)}`, {
  key: `shop-product-${slug}`,
})

if (error.value || !response.value?.data) {
  const status = apiErrorStatus(error.value) ?? 404
  throw createError({
    statusCode: status,
    statusMessage: status === 404 ? t('errors.notFound') : t('errors.somethingWrong'),
    fatal: true,
  })
}

const product = computed(() => response.value!.data)

const selection = ref<VariantSelection>(initialSelection(product.value))
const variant = computed(() => resolveVariant(product.value, selection.value))

function choose(attributeSlug: string, valueId: number) {
  selection.value = pickValue(product.value, selection.value, attributeSlug, valueId)
}

// Gallery: the chosen variant's own picture is shown when it has one.
const activeImage = ref(0)
watch(variant, (next) => {
  const index = variantImageIndex(product.value.images, next)
  if (index !== null) activeImage.value = index
}, { immediate: true })
const currentImage = computed(() => product.value.images[activeImage.value] ?? null)

const bounds = computed(() => (variant.value ? quantityBounds(variant.value) : { min: 1, max: 1 }))
const canBuy = computed(() => !!variant.value && variant.value.inStock && bounds.value.max >= bounds.value.min)
const quantity = ref(bounds.value.min)
watch(variant, (next) => {
  if (next) quantity.value = clampQuantity(quantity.value, next)
})

const stockText = computed(() => {
  const current = variant.value
  if (!current) return null
  if (!current.inStock) return t('shop.outOfStock')
  if (current.available !== null && current.available <= 10) return t('shop.stockLeft', { count: current.available }, current.available)
  return t('shop.inStock')
})

const adding = ref(false)
async function addToCart() {
  if (!variant.value || !canBuy.value) return
  adding.value = true
  try {
    await cart.add(variant.value.sku, quantity.value)
    toast.success(t('shop.product.added'), { label: t('shop.product.viewCart'), run: () => navigateTo(localePath('/shop/cart')) })
  }
  catch (addError) {
    toast.error(apiErrorMessage(addError, t('shop.product.addFailed')))
  }
  finally {
    adding.value = false
  }
}

function buyNow() {
  if (!variant.value || !canBuy.value) return
  const target = localePath({ path: '/shop/checkout', query: { buy: variant.value.sku, qty: String(quantity.value) } })
  if (session.isAuthenticated.value) navigateTo(target)
  else authModal.open('login', { redirect: target })
}

const seoTitle = product.value.seoTitle || product.value.name
const seoDescription = product.value.seoDescription || product.value.shortDescription || t('shop.seoDescription')

useSeoMeta({
  title: seoTitle,
  description: seoDescription,
})
useShareImage(product.value.images[0]?.url ?? product.value.imageUrl, 'MarketplaceSatori', {
  title: product.value.name,
  eyebrow: product.value.category?.name ?? t('shop.title'),
})

const breadcrumbs = computed(() => [
  { label: t('shop.home'), url: '/' },
  { label: t('shop.title'), url: '/shop' },
  ...product.value.breadcrumb.map(crumb => ({ label: crumb.name, url: `/shop/category/${crumb.slug}` })),
  { label: product.value.name, url: `/shop/${product.value.slug}` },
])

useSchemaOrg([
  defineWebPage({ '@type': 'ItemPage' }),
  defineProduct({
    name: product.value.name,
    description: seoDescription,
    image: product.value.images.map(image => image.url),
    offers: product.value.variants.map(item => ({
      price: item.price,
      priceCurrency: settings.value.defaultCurrency,
      availability: item.inStock ? 'InStock' : 'OutOfStock',
      url: `/shop/${product.value.slug}`,
    })),
  }),
  defineBreadcrumb({ itemListElement: breadcrumbs.value.map(crumb => ({ name: crumb.label, item: crumb.url })) }),
])
</script>

<template>
  <div class="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-10">
    <MarketplaceSeoBreadcrumbs :items="breadcrumbs" />

    <div class="grid gap-8 lg:grid-cols-2 lg:gap-12">
      <!-- Gallery -->
      <div>
        <div class="aspect-square overflow-hidden rounded-3xl bg-black/5 dark:bg-white/5">
          <NuxtImg
            v-if="currentImage"
            :src="currentImage.url"
            :alt="currentImage.alt || product.name"
            sizes="(min-width: 1024px) 560px, 100vw"
            class="h-full w-full object-cover"
          />
          <NuxtImg
            v-else-if="product.imageUrl"
            :src="product.imageUrl"
            :alt="product.imageAlt || product.name"
            sizes="(min-width: 1024px) 560px, 100vw"
            class="h-full w-full object-cover"
          />
          <UiPlaceholderMedia
            v-else
            icon="bag"
            class="h-full w-full"
          />
        </div>
        <div
          v-if="product.images.length > 1"
          class="mt-3 flex gap-2 overflow-x-auto pb-1"
        >
          <button
            v-for="(image, index) in product.images"
            :key="image.id"
            type="button"
            class="h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 transition"
            :class="index === activeImage ? 'border-brand-600' : 'border-transparent opacity-70 hover:opacity-100'"
            :aria-label="t('shop.product.showImage', { index: index + 1 })"
            :aria-pressed="index === activeImage"
            @click="activeImage = index"
          >
            <NuxtImg
              :src="image.url"
              :alt="image.alt || product.name"
              width="64"
              height="64"
              class="h-full w-full object-cover"
            />
          </button>
        </div>
      </div>

      <!-- Details -->
      <div>
        <p
          v-if="product.category"
          class="text-xs font-semibold tracking-wide text-black/50 uppercase dark:text-white/50"
        >
          {{ product.category.name }}
        </p>
        <h1 class="mt-1 font-display text-3xl font-bold tracking-tight">
          {{ product.name }}
        </h1>

        <ShopPrice
          class="mt-4"
          :price="variant?.price ?? product.priceMin"
          :price-max="variant ? null : product.priceMax"
          :compare-at="variant ? variant.compareAtPrice : product.compareAtPrice"
          size="lg"
        />

        <p
          v-if="product.shortDescription"
          class="mt-4 text-sm leading-relaxed text-black/70 dark:text-white/70"
        >
          {{ product.shortDescription }}
        </p>

        <!-- Variant picker -->
        <div
          v-for="attribute in product.attributes"
          :key="attribute.slug"
          class="mt-6"
        >
          <p
            :id="`attr-${attribute.slug}`"
            class="mb-2 text-sm font-bold"
          >
            {{ attribute.name }}
          </p>
          <div
            role="radiogroup"
            :aria-labelledby="`attr-${attribute.slug}`"
            class="flex flex-wrap gap-2"
          >
            <button
              v-for="value in attribute.values"
              :key="value.id"
              type="button"
              role="radio"
              :aria-checked="selection[attribute.slug] === value.id"
              :disabled="!isValueSelectable(product, value.id)"
              :aria-label="isValueAvailable(product, selection, attribute.slug, value.id) ? undefined : t('shop.product.optionUnavailable', { value: value.value })"
              class="min-w-12 rounded-xl border px-3.5 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:border-dashed disabled:text-black/30 disabled:line-through dark:disabled:text-white/30"
              :class="[
                selection[attribute.slug] === value.id
                  ? 'border-brand-600 bg-brand-50 text-brand-700 dark:bg-brand-700/20 dark:text-brand-100'
                  : 'border-black/15 hover:border-black/40 dark:border-white/15 dark:hover:border-white/40',
                !isValueAvailable(product, selection, attribute.slug, value.id) && 'border-dashed text-black/40 line-through dark:text-white/40',
              ]"
              @click="choose(attribute.slug, value.id)"
            >
              {{ value.value }}
            </button>
          </div>
        </div>

        <p
          v-if="product.attributes.length > 0 && !variant"
          class="mt-4 text-sm text-black/60 dark:text-white/60"
        >
          {{ t('shop.product.chooseOptions') }}
        </p>

        <div
          v-if="variant"
          class="mt-5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-black/60 dark:text-white/60"
        >
          <span>{{ t('shop.product.sku', { sku: variant.sku }) }}</span>
          <span
            :class="variant.inStock ? 'text-brand-700 dark:text-brand-400' : 'text-red-700 dark:text-red-300'"
            class="font-semibold"
          >{{ stockText }}</span>
          <span v-if="variant.minQty > 1">{{ t('shop.product.minQty', { count: variant.minQty }) }}</span>
          <span v-if="variant.maxQty !== null">{{ t('shop.product.maxQty', { count: variant.maxQty }) }}</span>
        </div>

        <div class="mt-6 flex flex-wrap items-center gap-3">
          <UiQuantityStepper
            id="shop-quantity"
            v-model="quantity"
            :min="bounds.min"
            :max="Math.max(bounds.min, bounds.max)"
            :disabled="!canBuy"
          />
          <UiButton
            variant="secondary"
            class="flex-1 py-3"
            :disabled="!canBuy || adding"
            @click="addToCart"
          >
            <UiIcon
              name="bag"
              :size="16"
            />
            {{ t('shop.product.addToCart') }}
          </UiButton>
          <UiButton
            class="flex-1 py-3"
            :disabled="!canBuy"
            @click="buyNow"
          >
            {{ t('shop.product.buyNow') }}
          </UiButton>
        </div>
        <p
          v-if="variant && canBuy"
          class="mt-2 text-xs text-black/50 dark:text-white/50"
        >
          {{ money(variant.price * quantity) }}
        </p>

        <section
          v-if="product.description"
          class="mt-10 border-t border-black/10 pt-6 dark:border-white/10"
        >
          <h2 class="mb-3 font-display text-lg font-bold">
            {{ t('shop.product.description') }}
          </h2>
          <UiRichText :html="product.description" />
        </section>
      </div>
    </div>
  </div>
</template>
