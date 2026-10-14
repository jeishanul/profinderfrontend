import type { HomeSectionItem } from '#shared/types/cms'

export type HeroTone = 'primary' | 'accent' | 'dark'

export interface HeroSlide {
  id: string
  headline: string
  sub: string
  eyebrow: string | null
  ctaLabel: string | null
  ctaUrl: string | null
  secondaryCtaLabel: string | null
  secondaryCtaUrl: string | null
  imageUrl: string | null
  /** Portrait crop for phones; the desktop image is used when there is none. */
  mobileImageUrl: string | null
  imageAlt: string
  icon: IconName
  tone: HeroTone
  /** `background` = full-bleed photo with overlaid text; `split` = coloured panel with a side image or icon. */
  layout: 'background' | 'split'
  overlay: number
  align: 'left' | 'center'
  focalX: number
  focalY: number
}

const DEFAULT_ICONS: IconName[] = ['search', 'wrench', 'broom']
const TONES: HeroTone[] = ['primary', 'accent', 'dark']

function clamp(value: unknown, min: number, max: number, fallback: number): number {
  const number = Number(value)
  return Number.isFinite(number) && value !== undefined && value !== '' ? Math.min(max, Math.max(min, number)) : fallback
}

function pick<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback
}

/** The admin's hero slides as the slider renders them. A `background` slide with no image degrades to `split`. */
export function buildHeroSlides(items: HomeSectionItem[]): HeroSlide[] {
  return items.map((item, index) => {
    const meta = item.meta ?? {}
    const imageUrl = item.imageUrl
    const wantsBackground = meta.layout === 'background'

    return {
      id: `cms-${index}`,
      headline: item.title ?? '',
      sub: item.description ?? '',
      eyebrow: cmsOptionalText(item.subtitle),
      ctaLabel: cmsOptionalText(item.ctaLabel),
      ctaUrl: isSafeLink(item.linkUrl) ? item.linkUrl : null,
      secondaryCtaLabel: cmsOptionalText(typeof meta.secondaryCtaLabel === 'string' ? meta.secondaryCtaLabel : null),
      secondaryCtaUrl: typeof meta.secondaryCtaUrl === 'string' && isSafeLink(meta.secondaryCtaUrl) ? meta.secondaryCtaUrl : null,
      imageUrl,
      mobileImageUrl: item.secondaryImageUrl,
      imageAlt: item.imageAlt ?? '',
      icon: knownIcon(item.icon, DEFAULT_ICONS[index % DEFAULT_ICONS.length]!),
      tone: pick(meta.tone, TONES, 'primary'),
      layout: wantsBackground && imageUrl ? 'background' : 'split',
      overlay: clamp(meta.overlay, 0, 80, 40),
      align: pick(meta.align, ['left', 'center'] as const, 'left'),
      focalX: clamp(meta.focalX, 0, 100, 50),
      focalY: clamp(meta.focalY, 0, 100, 50),
    }
  })
}
