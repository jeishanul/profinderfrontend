<script setup lang="ts">
import type { ShopCategory, ShopProductCard, ShopProductListMeta, ShopSort } from '#shared/types/shop'

// Auto-imported as <ShopProductListing/>. The storefront listing used by `/shop` and `/shop/category/[slug]`:
// category tree, search, sort and "Load more". Search and sort live in the URL (the URL is the source of truth);
// the category is the page's own path. Also owns the page's SEO, since only it knows the category's name.
const props = withDefaults(defineProps<{ category?: string | null }>(), { category: null })

const { t } = useI18n()
const route = useRoute()

const filters = computed(() => parseShopListQuery(route.query))

const categoriesRequest = useApi<{ data: ShopCategory[] }>('/shop/categories', { key: 'shop-categories' })
const listRequest = usePagedList<ShopProductCard, ShopProductListMeta>('/shop/products', {
  key: `shop-products-${props.category ?? 'all'}`,
  query: computed(() => ({
    category: props.category ?? undefined,
    q: filters.value.q || undefined,
    sort: filters.value.sort === 'newest' ? undefined : filters.value.sort,
  })),
  perPage: 24,
  itemKey: product => product.slug,
})
const [{ data: categoriesResponse }, list] = await Promise.all([categoriesRequest, listRequest])

if (props.category && apiErrorStatus(list.error.value) === 404) {
  throw createError({ statusCode: 404, statusMessage: t('errors.notFound'), fatal: true })
}

const categories = computed(() => categoriesResponse.value?.data ?? [])
const currentCategory = computed(() => list.meta.value?.category ?? null)

function findCategory(tree: ShopCategory[], slug: string): ShopCategory | null {
  for (const category of tree) {
    if (category.slug === slug) return category
    const found = findCategory(category.children, slug)
    if (found) return found
  }
  return null
}
const categoryNode = computed(() => (props.category ? findCategory(categories.value, props.category) : null))

function updateUrl(next: { q?: string, sort?: ShopSort }) {
  navigateTo({ path: route.path, query: toShopRouteQuery({ ...filters.value, ...next }) }, { replace: true })
}

// Typing is debounced; back/forward (a URL change) refills the box.
const searchInput = ref(filters.value.q)
const commitSearch = useDebounceFn((value: string) => updateUrl({ q: value.trim() }), 300)
watch(searchInput, value => commitSearch(value))
watch(() => filters.value.q, (q) => {
  if (q !== searchInput.value.trim()) searchInput.value = q
})

const sortModel = computed<ShopSort>({
  get: () => filters.value.sort,
  set: sort => updateUrl({ sort }),
})

const sidebarOpen = ref(false)

const breadcrumbs = computed(() => [
  { label: t('shop.home'), url: '/' },
  { label: t('shop.title'), url: '/shop' },
  ...(currentCategory.value?.breadcrumb ?? []).map(crumb => ({ label: crumb.name, url: `/shop/category/${crumb.slug}` })),
])

const heading = computed(() => currentCategory.value?.name ?? t('shop.title'))
const description = computed(() => categoryNode.value?.description
  || (currentCategory.value ? t('shop.categorySeoDescription', { category: currentCategory.value.name }) : t('shop.seoDescription')))

useSeoMeta({
  title: () => heading.value,
  description: () => description.value,
})
useShareImage(categoryNode.value?.imageUrl ?? null, 'MarketplaceSatori', {
  title: heading.value,
  eyebrow: t('shop.title'),
})
useSchemaOrg([
  defineWebPage({ '@type': 'CollectionPage' }),
  defineItemList({
    itemListElement: list.items.value.map((product, index) => ({
      position: index + 1,
      name: product.name,
      url: `/shop/${product.slug}`,
    })),
  }),
  ...(currentCategory.value
    ? [defineBreadcrumb({ itemListElement: breadcrumbs.value.map(crumb => ({ name: crumb.label, item: crumb.url })) })]
    : []),
])
</script>

<template>
  <div class="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-10">
    <MarketplaceSeoBreadcrumbs
      v-if="currentCategory"
      :items="breadcrumbs"
    />

    <div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 class="font-display text-3xl font-bold tracking-tight sm:text-4xl">
          {{ heading }}
        </h1>
        <p class="mt-1.5 text-sm text-black/60 dark:text-white/60">
          {{ categoryNode?.description || t('shop.subtitle') }}
        </p>
      </div>
      <NuxtLinkLocale
        to="/shop/cart"
        class="inline-flex items-center gap-2 self-start text-sm font-semibold text-brand-700 hover:text-brand-600 sm:self-auto dark:text-brand-400"
      >
        <UiIcon
          name="bag"
          :size="16"
        />
        {{ t('shop.cart.title') }}
      </NuxtLinkLocale>
    </div>

    <div class="grid gap-8 lg:grid-cols-[220px_1fr]">
      <aside>
        <button
          type="button"
          class="flex w-full items-center justify-between rounded-xl border border-black/10 px-4 py-3 text-sm font-semibold lg:hidden dark:border-white/10"
          :aria-expanded="sidebarOpen"
          aria-controls="shop-categories"
          @click="sidebarOpen = !sidebarOpen"
        >
          {{ sidebarOpen ? t('shop.hideCategories') : t('shop.showCategories') }}
          <UiIcon
            name="chevron-down"
            :size="16"
            class="transition-transform"
            :class="sidebarOpen && 'rotate-180'"
          />
        </button>
        <nav
          id="shop-categories"
          :aria-label="t('shop.categories')"
          class="mt-3 lg:mt-0 lg:block"
          :class="sidebarOpen ? 'block' : 'hidden'"
        >
          <h2 class="mb-2 hidden px-2.5 text-xs font-bold tracking-wide text-black/50 uppercase lg:block dark:text-white/50">
            {{ t('shop.categories') }}
          </h2>
          <NuxtLinkLocale
            to="/shop"
            class="mb-0.5 block rounded-lg px-2.5 py-1.5 text-sm transition-colors"
            :class="!category
              ? 'bg-brand-50 font-semibold text-brand-700 dark:bg-brand-700/20 dark:text-brand-100'
              : 'text-black/70 hover:bg-black/5 dark:text-white/70 dark:hover:bg-white/10'"
          >
            {{ t('shop.allProducts') }}
          </NuxtLinkLocale>
          <ShopCategoryTree
            :categories="categories"
            :active="category"
          />
        </nav>
      </aside>

      <section>
        <div class="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
          <label
            for="shop-search"
            class="sr-only"
          >{{ t('shop.searchLabel') }}</label>
          <UiInput
            id="shop-search"
            v-model="searchInput"
            icon="search"
            type="text"
            :placeholder="t('shop.searchPlaceholder')"
            class="flex-1"
          />
          <label
            for="shop-sort"
            class="flex items-center gap-2 text-sm"
          >
            <span class="shrink-0 text-black/60 dark:text-white/60">{{ t('shop.sortLabel') }}</span>
            <select
              id="shop-sort"
              v-model="sortModel"
              class="rounded-xl border border-black/10 bg-white px-3 py-3 text-sm dark:border-white/10 dark:bg-white/5"
            >
              <option
                v-for="sort in SHOP_SORTS"
                :key="sort"
                :value="sort"
              >
                {{ t(`shop.sort.${sort}`) }}
              </option>
            </select>
          </label>
        </div>

        <div
          v-if="list.items.value.length > 0"
          class="grid grid-cols-2 gap-4 sm:grid-cols-3"
        >
          <ShopProductCard
            v-for="product in list.items.value"
            :key="product.slug"
            :product="product"
          />
        </div>
        <div
          v-else
          class="rounded-3xl border border-dashed border-black/15 px-6 py-16 text-center dark:border-white/15"
        >
          <h2 class="font-display text-lg font-bold">
            {{ t('shop.noProducts') }}
          </h2>
          <p class="mt-1 text-sm text-black/60 dark:text-white/60">
            {{ t('shop.noProductsSub') }}
          </p>
        </div>

        <div class="mt-8">
          <DashboardLoadMore
            :shown="list.items.value.length"
            :total="list.meta.value?.total ?? 0"
            :has-more="list.hasMore.value"
            :loading="list.loadingMore.value"
            :failed="list.loadMoreFailed.value"
            @more="list.loadMore()"
          />
        </div>
      </section>
    </div>
  </div>
</template>
