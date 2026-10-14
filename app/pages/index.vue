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

// The landing page's layout: which sections exist, in what order, with the admin's text and images. If that request
// fails the default layout renders with built-in copy (see `resolveHomeSections`).
const { sections, heroBadge } = await useHomeSections()
const sectionFor = (key: string) => sections.value.find(section => section.key === key)
// The floating "keep scrolling" hint points at the why-choose-us section, wherever the admin put it (or not at all).
const whyChooseUs = computed(() => sectionFor('why_choose_us'))

const { data: categories } = await useCategories()

// Lists for the sections the admin left on the page; a hidden section costs no request.
// "Top-rated pros": verified, best-rated first — not just whoever signed up last. Or, when the admin set the section
// to manual, exactly the providers they featured.
const featuredSettings = sectionFor('featured_providers')?.settings
const featuredLimit = sectionNumber(featuredSettings, 'maxItems', 8)
const mode = featuredMode(featuredSettings)
const providersPage = sectionFor('featured_providers')
  ? (await useApi<PagedResult<ProviderSummary>>('/providers', {
      query: featuredQuery(mode, featuredLimit),
      key: `home-featured-${mode}-${featuredLimit}`,
    })).data
  : null
// When the visitor searched a province earlier this visit, prefer that province's pros — but only if it has enough
// to fill the row; a near-empty "Top-rated near X" would look worse than the national list.
const lastSearch = useLastSearch()
const FEATURED_MIN = 4
const provincePage = providersPage && mode === 'auto' && lastSearch.value?.provinceCode
  ? (await useApi<PagedResult<ProviderSummary>>('/providers', {
      query: featuredQuery(mode, featuredLimit, lastSearch.value.provinceCode),
      key: 'home-featured-province',
    })).data
  : null
const featuredIsLocal = computed(() => (provincePage?.value?.items.length ?? 0) >= FEATURED_MIN)
const featuredProviders = computed(() => (featuredIsLocal.value ? provincePage!.value!.items : providersPage?.value?.items ?? []))
const testimonials = sectionFor('testimonials') ? (await useApi<Testimonial[]>('/testimonials')).data : null
const faqItems = sectionFor('faq') ? (await useApi<FaqItem[]>('/faq')).data : null

// Loaded once here (a page, safe for top-level await) so every
// <MarketplaceProviderCard/> in <MarketplaceFeaturedProviders/> below can
// read `isSaved` synchronously.
if (providersPage) await useSavedProviders().ensureLoaded()

const GALLERY_TABS: GalleryTab[] = ['home', 'recommended', 'trending']
const galleryResponses = sectionFor('jobs_gallery')
  ? await Promise.all(GALLERY_TABS.map(tab => useApi<GalleryItem[]>('/gallery', { query: { tab }, key: `home-gallery-${tab}` })))
  : []
const galleryItemsByTab = computed(() => Object.fromEntries(
  GALLERY_TABS.map((tab, index) => [tab, galleryResponses[index]?.data.value ?? []]),
) as Record<GalleryTab, GalleryItem[]>)

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
      <MarketplaceTrustStats
        v-else-if="section.key === 'trust_stats'"
        :section="section"
      />
      <MarketplaceHowItWorksSteps
        v-else-if="section.key === 'how_it_works'"
        :section="section"
      />
      <MarketplaceCategoryCarousel
        v-else-if="section.key === 'categories'"
        :section="section"
        :categories="categories ?? []"
      />
      <MarketplaceFeaturedProviders
        v-else-if="section.key === 'featured_providers'"
        :section="section"
        :providers="featuredProviders"
        :local="featuredIsLocal"
        :categories="categories ?? []"
      />
      <MarketplaceWhyChooseUs
        v-else-if="section.key === 'why_choose_us'"
        :section="section"
      />
      <MarketplaceJobsGallery
        v-else-if="section.key === 'jobs_gallery'"
        :section="section"
        :items-by-tab="galleryItemsByTab"
        :categories="categories ?? []"
      />
      <MarketplaceTestimonialSlider
        v-else-if="section.key === 'testimonials'"
        :section="section"
        :testimonials="testimonials ?? []"
      />
      <MarketplaceDownloadAppSection
        v-else-if="section.key === 'app_download'"
        :section="section"
      />
      <MarketplaceFaqAccordion
        v-else-if="section.key === 'faq'"
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
