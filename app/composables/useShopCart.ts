import type { ShopCartItemInput, ShopCartView } from '#shared/types/shop'

const EMPTY_VIEW: ShopCartView = { items: [], subtotal: 0, itemCount: 0, hasIssues: false }

/**
 * The shop cart, for guests and signed-in shoppers alike.
 *
 * - A guest's cart is only `{ sku, quantity }` lines in this browser's localStorage; prices, stock and issues come
 *   from `POST /api/shop/cart/quote`.
 * - A signed-in shopper's cart lives on the server (`/api/shop/cart`).
 * - When someone signs in, the guest lines are merged into their server cart and cleared here.
 *
 * Personal data, so it never runs during SSR: `plugins/shop-cart.client.ts` calls `init()` once the app has mounted,
 * and the header badge starts at 0 on both server and client. State is in `useState` (request-isolated).
 */
export function useShopCart() {
  const session = useSession()
  /** The guest's lines (empty while signed in: the server holds the cart then). */
  const lines = useState<ShopCartItemInput[]>('shop-cart-lines', () => [])
  /** The priced cart, once loaded. */
  const view = useState<ShopCartView | null>('shop-cart-view', () => null)
  const loading = useState<boolean>('shop-cart-loading', () => false)
  const nuxtApp = useNuxtApp()

  const items = computed(() => view.value?.items ?? [])
  /** Units in the cart, for the header badge. A guest's count is known from storage before the quote returns. */
  const count = computed(() => (session.isAuthenticated.value ? (view.value?.itemCount ?? 0) : cartUnitCount(lines.value)))

  function persist(next: ShopCartItemInput[]) {
    lines.value = next
    try {
      if (next.length > 0) localStorage.setItem(SHOP_CART_STORAGE_KEY, JSON.stringify(next))
      else localStorage.removeItem(SHOP_CART_STORAGE_KEY)
    }
    catch {
      // Storage full or blocked (private mode): the cart still works for this visit.
    }
  }

  function readStorage(): ShopCartItemInput[] {
    try {
      return parseStoredCart(localStorage.getItem(SHOP_CART_STORAGE_KEY))
    }
    catch {
      return []
    }
  }

  async function quote(): Promise<void> {
    if (lines.value.length === 0) {
      view.value = EMPTY_VIEW
      return
    }
    const response = await useApiFetch<{ data: ShopCartView }>('/api/shop/cart/quote', { method: 'POST', body: { items: lines.value } })
    view.value = response.data
  }

  /** Re-reads the cart (server cart when signed in, a fresh quote for a guest). */
  async function refresh(): Promise<void> {
    loading.value = true
    try {
      if (session.isAuthenticated.value) {
        view.value = (await useApiFetch<{ data: ShopCartView }>('/api/shop/cart')).data
      }
      else {
        await quote()
      }
    }
    finally {
      loading.value = false
    }
  }

  /** Moves the guest lines into the signed-in account's cart, then forgets them here. */
  async function mergeIntoAccount(): Promise<void> {
    const guestLines = readStorage()
    if (guestLines.length === 0) {
      await refresh()
      return
    }
    const response = await useApiFetch<{ data: ShopCartView }>('/api/shop/cart/merge', { method: 'POST', body: { items: guestLines } })
    view.value = response.data
    persist([])
  }

  /**
   * Resolves once the cart matches the current session (e.g. the merge after a login has finished). Checkout waits
   * on this so it never previews a cart that is still being merged.
   */
  function whenSynced(): Promise<void> {
    return (nuxtApp._shopCartSync as Promise<void> | undefined) ?? Promise.resolve()
  }

  function track(task: Promise<void>): Promise<void> {
    const sync = task.catch(() => {
      // A failed sync leaves the cart as it was; the next action or page refreshes it.
    })
    nuxtApp._shopCartSync = sync
    return sync
  }

  /** Called once in the browser (`plugins/shop-cart.client.ts`): loads the guest cart and follows the session. */
  function init(): void {
    if (nuxtApp._shopCartStarted) return
    nuxtApp._shopCartStarted = true

    watch(() => session.user.value?.id ?? null, (userId) => {
      if (userId !== null) {
        void track(mergeIntoAccount())
      }
      else {
        // Guest (or just signed out): the account's cart is not shown any more; whatever is in storage is. The count
        // comes straight from storage, so nothing is fetched until a page needs prices (`refresh()`).
        view.value = null
        lines.value = readStorage()
      }
    }, { immediate: true })
  }

  async function setQuantity(sku: string, quantity: number): Promise<void> {
    if (session.isAuthenticated.value) {
      view.value = (await useApiFetch<{ data: ShopCartView }>('/api/shop/cart/items', { method: 'PUT', body: { sku, quantity: Math.max(0, quantity) } })).data
      return
    }
    persist(setCartLine(lines.value, sku, quantity))
    await quote()
  }

  /** Adds units of a variant (on top of what is already in the cart). */
  async function add(sku: string, quantity = 1): Promise<void> {
    await whenSynced()
    const current = session.isAuthenticated.value
      ? (view.value?.items.find(line => line.sku === sku)?.quantity ?? 0)
      : (lines.value.find(line => line.sku === sku)?.quantity ?? 0)
    if (!session.isAuthenticated.value) {
      persist(mergeCartLines(lines.value, [{ sku, quantity }]))
      await quote()
      return
    }
    await setQuantity(sku, current + quantity)
  }

  async function remove(sku: string): Promise<void> {
    if (session.isAuthenticated.value) {
      view.value = (await useApiFetch<{ data: ShopCartView }>(`/api/shop/cart/items/${encodeURIComponent(sku)}`, { method: 'DELETE' })).data
      return
    }
    persist(removeCartLine(lines.value, sku))
    await quote()
  }

  async function clear(): Promise<void> {
    if (session.isAuthenticated.value) {
      view.value = (await useApiFetch<{ data: ShopCartView }>('/api/shop/cart', { method: 'DELETE' })).data
      return
    }
    persist([])
    view.value = EMPTY_VIEW
  }

  return {
    items,
    view: computed(() => view.value),
    count,
    loading: computed(() => loading.value),
    init,
    whenSynced,
    refresh,
    add,
    setQuantity,
    remove,
    clear,
  }
}
