export type ButtonVariant = 'primary' | 'secondary' | 'ghost'
export type ButtonSize = 'sm' | 'md'

/**
 * Shared with `<UiButton>` so a `<NuxtLinkLocale>` that needs to *look* like
 * a button (an `<a>`, not a `<button>` nested inside one — invalid HTML) can
 * match it exactly instead of re-declaring the same Tailwind classes. Size
 * and variant are separate class groups (never combined into one override
 * string) because merging Tailwind utilities that touch the same CSS
 * property is order-dependent and unreliable.
 */
// `transition` (not `transition-colors`) — covers `transform` too, needed for
// the `active:scale` press feedback below; two transition-* utilities would
// fight over `transition-property` (last one in the generated stylesheet
// wins, not additive — see CLAUDE.md's Tailwind gotchas). The scale-down
// itself is the native-app "tap feedback" every button in the app gets for
// free from this one shared class (see CLAUDE.md's mobile redesign notes).
export const BUTTON_BASE_CLASS = 'inline-flex items-center justify-center gap-2 rounded-md font-medium transition active:scale-[0.97]'

export const BUTTON_SIZE_CLASS: Record<ButtonSize, string> = {
  sm: 'px-3.5 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
}

export const BUTTON_VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary: 'bg-brand-600 text-white hover:bg-brand-700',
  secondary: 'bg-brand-100 text-brand-700 hover:bg-brand-100/80',
  ghost: 'bg-transparent text-brand-700 hover:bg-brand-50',
}

export function linkButtonClass(variant: ButtonVariant = 'primary', size: ButtonSize = 'md'): string {
  return `${BUTTON_BASE_CLASS} ${BUTTON_SIZE_CLASS[size]} ${BUTTON_VARIANT_CLASS[variant]}`
}
