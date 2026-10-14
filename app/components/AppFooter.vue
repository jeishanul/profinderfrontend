<script setup lang="ts">
const { t } = useI18n()
const { settings } = useSiteSettings()
const { navigation, viewer } = useNavigation()
const { copyright, tagline2 } = useFooterText()
const requestUrl = useRequestURL()

// The columns, link rows, bottom links and social icons all come from the admin (see `useNavigation`); a menu or
// link a visitor isn't meant to see is dropped here, and so is a column left empty by that.
const columns = computed(() => visibleColumns(navigation.value.footerColumns, viewer.value))
const rows = computed(() => visibleMenus(navigation.value.footerRows, viewer.value))
const bottomLinks = computed(() => visibleLinks(navigation.value.footerBottom, viewer.value))
// Brand + the admin's columns + contact + the app: the grid is as wide as that.
const columnCount = computed(() => columns.value.length + 3)

const qrTarget = computed(() => settings.value.appStoreUrl ?? settings.value.playStoreUrl ?? requestUrl.origin)

const linkClass = 'text-white/80 hover:text-white'
</script>

<template>
  <footer class="bg-brand-700 py-14 text-white/90 dark:bg-black">
    <div
      class="mx-auto grid max-w-6xl gap-10 px-4 sm:grid-cols-2 sm:px-6 lg:[grid-template-columns:repeat(var(--footer-columns),minmax(0,1fr))] lg:px-10"
      :style="{ '--footer-columns': columnCount }"
    >
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
          v-if="navigation.social.length > 0"
          class="mt-5 flex flex-wrap gap-2.5"
        >
          <a
            v-for="social in navigation.social"
            :key="social.network"
            :href="social.url"
            target="_blank"
            rel="noopener noreferrer"
            :aria-label="social.label"
            class="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-white/80 transition-colors hover:bg-white/20 hover:text-white"
          >
            <UiIcon
              :name="socialIconName(social.network)"
              :filled="socialIconFilled(social.network)"
              :size="16"
            />
          </a>
        </div>
      </div>

      <div
        v-for="menus in columns"
        :key="menus[0]!.key"
      >
        <template
          v-for="(menu, menuIndex) in menus"
          :key="menu.key"
        >
          <p
            v-if="menu.title"
            class="mb-4 text-xs font-bold uppercase tracking-wide text-white/50"
            :class="menuIndex > 0 ? 'mt-6' : ''"
          >
            {{ menu.title }}
          </p>
          <ul class="flex flex-col gap-2.5 text-sm">
            <li
              v-for="link in menu.items"
              :key="`${link.url}|${link.label}`"
            >
              <CmsLink
                :to="link.url"
                :new-tab="link.newTab"
                :class="linkClass"
              >
                {{ link.label }}
              </CmsLink>
            </li>
          </ul>
        </template>
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

    <div
      v-if="rows.length > 0"
      class="mx-auto mt-10 flex max-w-6xl flex-col gap-6 px-4 sm:px-6 lg:px-10"
    >
      <div
        v-for="row in rows"
        :key="row.key"
      >
        <p
          v-if="row.title"
          class="mb-3 text-xs font-bold uppercase tracking-wide text-white/50"
        >
          {{ row.title }}
        </p>
        <ul class="flex flex-wrap gap-x-5 gap-y-2 text-sm">
          <li
            v-for="link in row.items"
            :key="`${link.url}|${link.label}`"
          >
            <CmsLink
              :to="link.url"
              :new-tab="link.newTab"
              :class="linkClass"
            >
              {{ link.label }}
            </CmsLink>
          </li>
        </ul>
      </div>
    </div>

    <div class="mx-auto mt-10 flex max-w-6xl flex-col gap-2 border-t border-white/15 px-4 pt-6 text-xs text-white/60 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-10">
      <span>{{ copyright }}</span>
      <span class="flex flex-wrap items-center gap-x-5 gap-y-1">
        <CmsLink
          v-for="link in bottomLinks"
          :key="`${link.url}|${link.label}`"
          :to="link.url"
          :new-tab="link.newTab"
          class="hover:text-white"
        >
          {{ link.label }}
        </CmsLink>
        <span>{{ tagline2 }}</span>
      </span>
    </div>
  </footer>
</template>
