<script setup lang="ts">
import type {
  FaqItem,
  GalleryItem,
  GalleryTab,
  PagedResult,
  ProviderSummary,
  Testimonial,
} from '#shared/types/marketplace'

const { t } = useI18n()
const localePath = useLocalePath()

// Data loads in two rounds, each a single parallel batch (a request awaited on its own would add a full round trip to
// every render). Round 1: the layout, plus the categories, which don't depend on it.
// The landing page's layout: which sections exist, in what order, with the admin's text and images. If that request
// fails the default layout renders with built-in copy (see `resolveHomeSections`).
const categoriesRequest = useCategories()
const [{ sections, heroBadge }] = await Promise.all([useHomeSections(), categoriesRequest])
const { data: categories } = categoriesRequest
const sectionFor = (key: string) => sections.value.find(section => section.key === key)
// In the template, every section except the hero, the quick tiles and the scroll hint is `Lazy…` + `hydrate-on-visible`.
// The server still renders them all, but the browser only downloads and runs a section's code when someone scrolls to
// it. The admin decides the order, so nothing assumes what is below the fold: a section already in view hydrates at once.
// The floating "keep scrolling" hint points at the why-choose-us section, wherever the admin put it (or not at all).
const whyChooseUs = computed(() => sectionFor('why_choose_us'))

// Round 2: the lists for the sections the admin left on the page; a hidden section costs no request. They depend
// only on which sections exist, not on each other, so they all start before any is awaited.
// "Top-rated pros": verified, best-rated first — not just whoever signed up last. Or, when the admin set the section
// to manual, exactly the providers they featured.
const featuredSettings = sectionFor('featured_providers')?.settings
const featuredLimit = sectionNumber(featuredSettings, 'maxItems', 8)
const mode = featuredMode(featuredSettings)
const providersRequest = sectionFor('featured_providers')
  ? useApi<PagedResult<ProviderSummary>>('/providers', {
      query: featuredQuery(mode, featuredLimit),
      key: `home-featured-${mode}-${featuredLimit}`,
    })
  : null
// When the visitor searched a province earlier this visit, prefer that province's pros — but only if it has enough
// to fill the row; a near-empty "Top-rated near X" would look worse than the national list.
const lastSearch = useLastSearch()
const FEATURED_MIN = 4
const provinceRequest = providersRequest && mode === 'auto' && lastSearch.value?.provinceCode
  ? useApi<PagedResult<ProviderSummary>>('/providers', {
      query: featuredQuery(mode, featuredLimit, lastSearch.value.provinceCode),
      key: 'home-featured-province',
    })
  : null
const testimonialsRequest = sectionFor('testimonials') ? useApi<Testimonial[]>('/testimonials') : null
const faqRequest = sectionFor('faq') ? useApi<FaqItem[]>('/faq') : null
const GALLERY_TABS: GalleryTab[] = ['home', 'recommended', 'trending']
const galleryResponses = sectionFor('jobs_gallery')
  ? GALLERY_TABS.map(tab => useApi<GalleryItem[]>('/gallery', { query: { tab }, key: `home-gallery-${tab}` }))
  : []

await Promise.all([providersRequest, provinceRequest, testimonialsRequest, faqRequest, ...galleryResponses])

const providersPage = providersRequest?.data ?? null
const provincePage = provinceRequest?.data ?? null
const featuredIsLocal = computed(() => (provincePage?.value?.items.length ?? 0) >= FEATURED_MIN)
const featuredProviders = computed(() => (featuredIsLocal.value ? provincePage!.value!.items : providersPage?.value?.items ?? []))
const testimonials = testimonialsRequest?.data ?? null
const faqItems = faqRequest?.data ?? null
const galleryItemsByTab = computed(() => Object.fromEntries(
  GALLERY_TABS.map((tab, index) => [tab, galleryResponses[index]?.data.value ?? []]),
) as Record<GalleryTab, GalleryItem[]>)

// The hearts on <MarketplaceProviderCard/> in <MarketplaceFeaturedProviders/>: personal, so filled in after mount.
if (providersPage) useSavedProviders().loadAfterMount()

function handleHeroSearch({ category, province, city, barangay }: { category: string, province: string, city: string, barangay: string }) {
  lastSearch.value = province ? { provinceCode: province } : null

  navigateTo(localePath({
    path: '/browse',
    query: {
      ...(category ? { categories: category } : {}),
      ...(province ? { province } : {}),
      ...(city ? { city } : {}),
      ...(barangay ? { barangay } : {}),
    },
  }))
}

const { settings } = useSiteSettings()
useSeoMeta({
  title: () => settings.value.seoDefaultTitle ?? t('home.seoTitle'),
  description: () => settings.value.seoDefaultDescription ?? t('home.seoDescription', { name: settings.value.siteName ?? t('brand.name') }),
})
useShareImage(null, 'DefaultSatori', {
  title: settings.value.seoDefaultTitle ?? t('home.seoTitle'),
  description: settings.value.seoDefaultDescription ?? t('home.seoDescription', { name: settings.value.siteName ?? t('brand.name') }),
})
useSchemaOrg([defineWebPage()])
</script>

<template>
  <div>
    <!-- The quick-tap row sits under the hero; with no hero on the page it goes first. -->
    <MarketplaceQuickTiles v-if="!sectionFor('hero_slides')" />

    <template
      v-for="section in sections"
      :key="section.key"
    >
      <template v-if="section.key === 'hero_slides'">
        <MarketplaceHeroSlider
          :section="section"
          :badge="heroBadge"
          :categories="categories ?? []"
          @search="handleHeroSearch"
        />
        <MarketplaceQuickTiles />
      </template>
      <LazyMarketplaceTrustStats
        v-else-if="section.key === 'trust_stats'"
        hydrate-on-visible
        :section="section"
      />
      <LazyMarketplaceHowItWorksSteps
        v-else-if="section.key === 'how_it_works'"
        hydrate-on-visible
        :section="section"
      />
      <LazyMarketplaceCategoryCarousel
        v-else-if="section.key === 'categories'"
        hydrate-on-visible
        :section="section"
        :categories="categories ?? []"
      />
      <LazyMarketplaceFeaturedProviders
        v-else-if="section.key === 'featured_providers'"
        hydrate-on-visible
        :section="section"
        :providers="featuredProviders"
        :local="featuredIsLocal"
        :categories="categories ?? []"
      />
      <LazyMarketplaceWhyChooseUs
        v-else-if="section.key === 'why_choose_us'"
        hydrate-on-visible
        :section="section"
      />
      <LazyMarketplaceJobsGallery
        v-else-if="section.key === 'jobs_gallery'"
        hydrate-on-visible
        :section="section"
        :items-by-tab="galleryItemsByTab"
        :categories="categories ?? []"
      />
      <LazyMarketplaceTestimonialSlider
        v-else-if="section.key === 'testimonials'"
        hydrate-on-visible
        :section="section"
        :testimonials="testimonials ?? []"
      />
      <LazyMarketplaceDownloadAppSection
        v-else-if="section.key === 'app_download'"
        hydrate-on-visible
        :section="section"
      />
      <LazyMarketplaceFaqAccordion
        v-else-if="section.key === 'faq'"
        hydrate-on-visible
        :section="section"
        :items="faqItems ?? []"
      />
      <CmsBlock
        v-else
        :section="section"
      />
    </template>

    <MarketplaceScrollHintArrow
      v-if="whyChooseUs"
      :target="sectionAnchor(whyChooseUs, 'why-choose-us')!"
    />
  </div>
</template>
