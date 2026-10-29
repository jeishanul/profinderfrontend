<script setup lang="ts">
// The cart. Browser-only (personal; a guest's cart is in localStorage), see `routeRules`.
const { t } = useI18n()
const { money, settings } = useSiteSettings()
const toast = useToast()
const { confirm } = useConfirm()
const session = useSession()
const authModal = useAuthModal()
const localePath = useLocalePath()
const cart = useShopCart()

const loadFailed = ref(false)
const busy = ref(false)

onMounted(async () => {
  try {
    await cart.whenSynced()
    await cart.refresh()
  }
  catch {
    loadFailed.value = true
  }
})

async function run(action: () => Promise<void>) {
  busy.value = true
  try {
    await action()
  }
  catch (error) {
    toast.error(apiErrorMessage(error, t('shop.cart.updateFailed')))
    await cart.refresh().catch(() => {})
  }
  finally {
    busy.value = false
  }
}

const setQuantity = (sku: string, quantity: number) => run(() => cart.setQuantity(sku, quantity))
const remove = (sku: string) => run(() => cart.remove(sku))

async function clearCart() {
  const confirmed = await confirm({
    title: t('shop.cart.clearConfirm.title'),
    message: t('shop.cart.clearConfirm.message'),
    confirmLabel: t('shop.cart.clearConfirm.confirm'),
    tone: 'danger',
  })
  if (confirmed) await run(() => cart.clear())
}

function checkout() {
  const target = localePath('/shop/checkout')
  if (session.isAuthenticated.value) navigateTo(target)
  else authModal.open('login', { redirect: target })
}

const view = cart.view
const isEmpty = computed(() => (view.value?.items.length ?? 0) === 0)

useSeoMeta({
  title: () => t('shop.cart.seoTitle'),
  description: () => t('shop.seoDescription'),
})
useSchemaOrg([defineWebPage()])
</script>

<template>
  <div class="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-10">
    <h1 class="font-display text-3xl font-bold tracking-tight">
      {{ t('shop.cart.title') }}
    </h1>

    <p
      v-if="loadFailed"
      role="alert"
      class="mt-6 text-sm text-red-700 dark:text-red-300"
    >
      {{ t('shop.cart.loadFailed') }}
    </p>

    <div
      v-else-if="!view"
      class="mt-6 h-40 animate-pulse rounded-3xl bg-black/5 dark:bg-white/5"
    />

    <div
      v-else-if="isEmpty"
      class="mt-6 rounded-3xl border border-dashed border-black/15 px-6 py-16 text-center dark:border-white/15"
    >
      <h2 class="font-display text-lg font-bold">
        {{ t('shop.cart.empty') }}
      </h2>
      <p class="mt-1 text-sm text-black/60 dark:text-white/60">
        {{ t('shop.cart.emptySub') }}
      </p>
      <NuxtLinkLocale
        to="/shop"
        :class="[linkButtonClass('primary'), 'mt-5']"
      >
        {{ t('shop.cart.continueShopping') }}
      </NuxtLinkLocale>
    </div>

    <div
      v-else
      class="mt-6 grid gap-8 lg:grid-cols-[1fr_320px]"
    >
      <div>
        <p
          v-if="view.hasIssues"
          role="alert"
          class="mb-2 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 dark:bg-red-900/30 dark:text-red-300"
        >
          {{ t('shop.cart.fixIssues') }}
        </p>
        <div class="divide-y divide-black/10 dark:divide-white/10">
          <ShopCartLine
            v-for="line in view.items"
            :key="line.sku"
            :line="line"
            editable
            :busy="busy"
            @quantity="setQuantity"
            @remove="remove"
          />
        </div>
        <div class="mt-4 flex items-center justify-between">
          <NuxtLinkLocale
            to="/shop"
            class="text-sm font-semibold text-brand-700 hover:text-brand-600 dark:text-brand-400"
          >
            {{ t('shop.cart.continueShopping') }}
          </NuxtLinkLocale>
          <button
            type="button"
            class="text-sm font-semibold text-black/50 hover:text-red-600 dark:text-white/50 dark:hover:text-red-400"
            :disabled="busy"
            @click="clearCart"
          >
            {{ t('shop.cart.clear') }}
          </button>
        </div>
      </div>

      <aside class="h-fit rounded-3xl border border-black/10 p-5 dark:border-white/10">
        <div class="flex items-center justify-between text-sm">
          <span>{{ t('shop.cart.subtotal') }} <span class="text-black/50 dark:text-white/50">({{ t('shop.cart.itemCount', { count: view.itemCount }, view.itemCount) }})</span></span>
          <span class="text-lg font-bold">{{ money(view.subtotal) }}</span>
        </div>
        <p class="mt-1 text-xs text-black/50 dark:text-white/50">
          {{ t('shop.cart.shippingNote') }}
          <template v-if="settings.shopPriceNote">
            {{ settings.shopPriceNote }}
          </template>
        </p>
        <UiButton
          class="mt-5 w-full py-3"
          :disabled="view.hasIssues || busy"
          @click="checkout"
        >
          {{ t('shop.cart.checkout') }}
        </UiButton>
      </aside>
    </div>
  </div>
</template>
