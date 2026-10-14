import type { CmsOptions, HomeSection } from '#shared/types/cms'

/**
 * The admin's text when they filled the field in, else the built-in (i18n) copy. Empty and whitespace-only count as
 * "not filled in", so clearing a field in the admin restores the default rather than blanking the section.
 */
export function cmsText(value: string | null | undefined, fallback: string): string {
  const trimmed = value?.trim()
  return trimmed ? trimmed : fallback
}

/** Like `cmsText` but with no default: the trimmed text, or null. */
export function cmsOptionalText(value: string | null | undefined): string | null {
  return value?.trim() || null
}

/** A site-relative path (`/browse`, `/#how-it-works`), not a protocol-relative `//host`. */
export function isInternalPath(url: string): boolean {
  return url.startsWith('/') && !url.startsWith('//')
}

/**
 * The backend only stores links it has validated, but this is the last stop before an `href`, so it checks again:
 * a site path, an in-page anchor, http(s), mailto: or tel:, and nothing else (no `javascript:`/`data:`).
 */
export function isSafeLink(url: string | null | undefined): url is string {
  if (!url || /[\s\\]/.test(url)) return false
  if (isInternalPath(url) || url.startsWith('#')) return true
  return /^(?:https?:\/\/[^/?#]+|mailto:[^@\s]+@[^@\s]+|tel:\+?[\d().-]{3,})/i.test(url)
}

/** An option the admin set on a section, as a number. */
export function sectionNumber(options: CmsOptions | undefined, key: string, fallback: number): number {
  const value = Number(options?.[key])
  return Number.isFinite(value) && options?.[key] !== undefined && options?.[key] !== '' ? value : fallback
}

/** An option the admin set on a section, as text; empty means "use the default". */
export function sectionText(options: CmsOptions | undefined, key: string, fallback: string): string {
  const value = options?.[key]
  return typeof value === 'string' ? cmsText(value, fallback) : fallback
}

/** An option as text, or null when the admin left it empty. */
export function sectionOptionalText(options: CmsOptions | undefined, key: string): string | null {
  const value = options?.[key]
  return typeof value === 'string' ? cmsOptionalText(value) : null
}

/** Element id for a section wrapper so a `/#anchor` menu link can find it. */
export function sectionAnchor(section: HomeSection, fallback?: string): string | undefined {
  return section.anchor ?? fallback
}
