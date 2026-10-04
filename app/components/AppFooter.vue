<script setup lang="ts">
import type { ServiceCategory } from '#shared/types/marketplace'

const { t } = useI18n()
const { settings } = useSiteSettings()
const requestUrl = useRequestURL()
const year = new Date().getFullYear()

const CUSTOMER_LINKS = [
  { label: t('footer.customers.browseServices'), to: '/browse' },
  { label: t('footer.customers.howItWorks'), to: '/#how-it-works' },
]

// Popular categories and legal pages come from the API (admins manage both),
// not a hardcoded list that silently goes stale. Lazy: the footer is below
// the fold and must never block the page.
const { data: categories } = useApi<ServiceCategory[]>('/categories', { key: 'footer-categories', lazy: true, default: () => [] })
const { data: legalPages } = useApi<{ slug: string, title: string }[]>('/pages', { key: 'footer-pages', lazy: true, default: () => [] })

const popularCategories = computed(() => [...(categories.value ?? [])]
  .filter(category => category.providerCount > 0)
  .sort((a, b) => b.providerCount - a.providerCount)
  .slice(0, 6))

// Only the social networks the admin actually filled in (a dead "#" icon is worse than none).
const socialLinks = computed(() => [
  { label: t('footer.social.facebook'), icon: 'facebook' as IconName, filled: true, href: settings.value.social.facebook },
  { label: t('footer.social.x'), icon: 'x' as IconName, filled: false, href: settings.value.social.x },
  { label: t('footer.social.instagram'), icon: 'instagram' as IconName, filled: false, href: settings.value.social.instagram },
].filter(link => Boolean(link.href)))

const qrTarget = computed(() => settings.value.appStoreUrl ?? settings.value.playStoreUrl ?? requestUrl.origin)
</script>

<template>
  <footer class="bg-brand-700 py-14 text-white/90 dark:bg-black">
    <div class="mx-auto grid max-w-6xl gap-10 px-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-5 lg:px-10">
      <div class="sm:col-span-2 lg:col-span-1">
        <div class="font-display text-lg font-bold text-white">
          <AppBrand
            size="sm"
            text-class="text-white"
          />
        </div>
        <p class="mt-4 max-w-xs text-sm text-white/70">
          {{ settings.siteTagline ?? t('footer.tagline') }}
        </p>
        <div
          v-if="socialLinks.length > 0"
          class="mt-5 flex gap-2.5"
        >
          <a
            v-for="social in socialLinks"
            :key="social.label"
            :href="social.href!"
            target="_blank"
            rel="noopener noreferrer"
            :aria-label="social.label"
            class="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-white/80 transition-colors hover:bg-white/20 hover:text-white"
          >
            <UiIcon
              :name="social.icon"
              :filled="social.filled"
              :size="16"
            />
          </a>
        </div>
      </div>

      <div>
        <p class="mb-4 text-xs font-bold uppercase tracking-wide text-white/50">
          {{ t('footer.customers.heading') }}
        </p>
        <ul class="flex flex-col gap-2.5 text-sm">
          <li
            v-for="link in CUSTOMER_LINKS"
            :key="link.to"
          >
            <NuxtLinkLocale
              :to="link.to"
              class="text-white/80 hover:text-white"
            >
              {{ link.label }}
            </NuxtLinkLocale>
          </li>
        </ul>
        <p class="mt-6 mb-4 text-xs font-bold uppercase tracking-wide text-white/50">
          {{ t('footer.providers.heading') }}
        </p>
        <ul class="flex flex-col gap-2.5 text-sm">
          <li>
            <NuxtLinkLocale
              to="/become-a-provider"
              class="text-white/80 hover:text-white"
            >
              {{ t('footer.providers.becomeProvider') }}
            </NuxtLinkLocale>
          </li>
        </ul>
        <template v-if="legalPages && legalPages.length > 0">
          <p class="mt-6 mb-4 text-xs font-bold uppercase tracking-wide text-white/50">
            {{ t('footer.legal.heading') }}
          </p>
          <ul class="flex flex-col gap-2.5 text-sm">
            <li
              v-for="page in legalPages"
              :key="page.slug"
            >
              <NuxtLinkLocale
                :to="`/legal/${page.slug}`"
                class="text-white/80 hover:text-white"
              >
                {{ page.title }}
              </NuxtLinkLocale>
            </li>
          </ul>
        </template>
      </div>

      <div>
        <p class="mb-4 text-xs font-bold uppercase tracking-wide text-white/50">
          {{ t('footer.categories.heading') }}
        </p>
        <ul class="flex flex-col gap-2.5 text-sm">
          <li
            v-for="category in popularCategories"
            :key="category.id"
          >
            <NuxtLinkLocale
              :to="{ path: '/browse', query: { categories: category.id } }"
              class="text-white/80 hover:text-white"
            >
              {{ category.name }}
            </NuxtLinkLocale>
          </li>
        </ul>
      </div>

      <div>
        <p class="mb-4 text-xs font-bold uppercase tracking-wide text-white/50">
          {{ t('footer.contact.heading') }}
        </p>
        <ul class="flex flex-col gap-2.5 text-sm">
          <li v-if="settings.contactPhone">
            <a
              :href="`tel:${settings.contactPhone}`"
              class="inline-flex items-center gap-2 text-white/80 hover:text-white"
            >
              <UiIcon
                name="phone"
                :size="14"
              />
              {{ settings.contactPhone }}
            </a>
          </li>
          <li v-if="settings.contactEmail">
            <a
              :href="`mailto:${settings.contactEmail}`"
              class="inline-flex items-start gap-2 text-white/80 hover:text-white"
            >
              <UiIcon
                name="mail"
                :size="14"
                class="mt-0.5 shrink-0"
              />
              <span class="text-xs leading-relaxed break-all">{{ settings.contactEmail }}</span>
            </a>
          </li>
        </ul>
        <p
          v-if="settings.supportHours"
          class="mt-3 text-xs text-white/50"
        >
          {{ settings.supportHours }}
        </p>
      </div>

      <div>
        <p class="mb-4 text-xs font-bold uppercase tracking-wide text-white/50">
          {{ t('footer.getTheApp') }}
        </p>
        <!-- Badges stacked on the left, QR code to the right, as a block. -->
        <div class="flex items-start gap-4">
          <MarketplaceAppStoreBadges tone="dark" />
          <UiQrCode
            :value="qrTarget"
            :size="72"
            :label="t('footer.getTheApp')"
          />
        </div>
      </div>
    </div>

    <div class="mx-auto mt-10 flex max-w-6xl flex-col gap-2 border-t border-white/15 px-4 pt-6 text-xs text-white/60 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-10">
      <span>{{ t('footer.copyright', { year, name: settings.siteName ?? t('brand.name') }) }}</span>
      <span>{{ t('footer.tagline2') }}</span>
    </div>
  </footer>
</template>
