import type { CmsOptions } from '#shared/types/cms'

/** `auto` shows the best-rated verified providers; `manual` shows only the ones an admin featured. */
export type FeaturedMode = 'auto' | 'manual'

/** The section's mode; anything but an explicit `manual` is automatic, so a missing setting never hides the section. */
export function featuredMode(settings: CmsOptions | undefined): FeaturedMode {
  return settings?.mode === 'manual' ? 'manual' : 'auto'
}

/**
 * The `/providers` query for the home page's featured section.
 * Automatic: verified providers, best rated first, preferring one province when the visitor searched it earlier.
 * Manual: exactly the providers an admin featured (verified or not), best rated first. A province preference doesn't
 * apply: the admin chose these.
 */
export function featuredQuery(mode: FeaturedMode, limit: number, province?: string | null): Record<string, string | number | boolean> {
  if (mode === 'manual') return { perPage: limit, sort: 'rating', featuredOnly: true }

  return { perPage: limit, sort: 'rating', verifiedOnly: true, ...(province ? { province } : {}) }
}
