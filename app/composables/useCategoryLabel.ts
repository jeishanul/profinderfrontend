/**
 * Display name for a category. Rows carry the category's current `name` from
 * the API, so an admin rename shows up everywhere; the slug is only a last
 * resort (a booking/conversation whose category was later deleted has neither,
 * and gets the "Uncategorised" label instead of a raw key on screen).
 */
export function useCategoryLabel() {
  const { t } = useI18n()

  return (categoryId: string | null | undefined, name?: string | null): string => {
    if (name) return name
    if (!categoryId) return t('marketplace.uncategorised')
    return categoryId.replace(/-/g, ' ').replace(/^./, c => c.toUpperCase())
  }
}
