import type { ServiceCategory } from '#shared/types/marketplace'

/**
 * The service categories. Two cached variants only — plain, and with each category's skills (Browse's sidebar, the
 * provider forms) — so a page never fetches what another page already loaded under a different key.
 * Pass `lazy` for below-the-fold uses (header, footer) that must never block a page.
 */
export function useCategories(options: { withSkills?: boolean, lazy?: boolean } = {}) {
  return useApi<ServiceCategory[]>('/categories', {
    key: options.withSkills ? 'categories-with-skills' : 'categories',
    ...(options.withSkills ? { query: { include: 'skills' } } : {}),
    lazy: options.lazy ?? false,
    default: () => [],
  })
}
