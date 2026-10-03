/**
 * The most recent province the user searched from the hero/browse search
 * bar, within this app session — lets the homepage's "Featured" section say
 * where it's sampling from instead of a blanket "near you" that never
 * actually reflected a location. `useState`, not `localStorage`: it only
 * needs to survive client-side navigation for this visit, not persist.
 */
export function useLastSearch() {
  return useState<{ provinceCode: string } | null>('last-search', () => null)
}
