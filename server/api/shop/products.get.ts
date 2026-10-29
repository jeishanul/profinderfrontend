import type { Paged } from '#shared/types/dashboard'
import type { ShopProductCard, ShopProductListMeta } from '#shared/types/shop'

export default defineEventHandler((event): Promise<Paged<ShopProductCard, ShopProductListMeta>> => {
  const query = getQuery(event)

  const apiQuery = {
    category: query.category || undefined,
    q: query.q || undefined,
    sort: query.sort || undefined,
    page: query.page,
    perPage: query.perPage,
  }

  // Free-text searches skip the shared cache: every phrasing would be its own entry.
  return query.q
    ? callApi<Paged<ShopProductCard, ShopProductListMeta>>(event, '/shop/products', { query: apiQuery, auth: false })
    : getPublicApi<Paged<ShopProductCard, ShopProductListMeta>>(event, '/shop/products', apiQuery)
})
