/**
 * The footer's copyright line and second tagline: the admin's text (`{year}` and `{siteName}` are filled in), else the
 * built-in copy. Shared by the desktop and phone footers.
 */
export function useFooterText() {
  const { t } = useI18n()
  const { settings } = useSiteSettings()
  const year = new Date().getFullYear()

  const siteName = computed(() => settings.value.siteName ?? t('brand.name'))
  const copyright = computed(() => settings.value.footerCopyright
    ? formatFooterText(settings.value.footerCopyright, { year, siteName: siteName.value })
    : t('footer.copyright', { year, name: siteName.value }))
  const tagline2 = computed(() => settings.value.footerTaglineSecondary ?? t('footer.tagline2'))

  return { copyright, tagline2 }
}
