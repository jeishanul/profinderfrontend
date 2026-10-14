/**
 * The picture shown when a page is shared on social media. The admin's own image for the page wins, then the site's
 * default share image; with neither, the generated card (`template`) is used as before. Call it once per page, in
 * place of `defineOgImage`.
 */
export function useShareImage(image: string | null | undefined, template: 'DefaultSatori' | 'MarketplaceSatori', props: Record<string, unknown>) {
  const { settings } = useSiteSettings()
  const url = image || settings.value.defaultOgImageUrl

  if (url) {
    // The SEO module makes a non-https address absolute against this site, so `/storage/**` is proxied to the backend
    // (see `routeRules` in nuxt.config.ts); an https address is used as it is.
    useSeoMeta({ ogImage: url, twitterImage: url, twitterCard: 'summary_large_image' })
    return
  }

  defineOgImage(template, props)
}
