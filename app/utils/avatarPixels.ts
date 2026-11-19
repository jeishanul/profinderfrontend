/** Used when the size can't be read from the classes (e.g. `h-full`): big enough for the largest avatar shown. */
export const AVATAR_FALLBACK_PIXELS = 160

/**
 * The CSS pixel size of an avatar from its Tailwind height class (`h-9` → 36, `h-[76px]` → 76), so the image is
 * requested at the size it's shown instead of the uploaded original. Responsive variants (`sm:h-12`) are ignored:
 * the base size is the one requested, and `densities` covers 2x screens.
 */
export function avatarPixels(sizeClass: string): number {
  for (const token of sizeClass.split(/\s+/)) {
    const arbitrary = /^(?:h|size)-\[(\d+(?:\.\d+)?)px\]$/.exec(token)
    if (arbitrary) return Math.round(Number(arbitrary[1]))
    const scale = /^(?:h|size)-(\d+(?:\.\d+)?)$/.exec(token)
    if (scale) return Math.round(Number(scale[1]) * 4)
  }
  return AVATAR_FALLBACK_PIXELS
}
