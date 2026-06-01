/**
 * XP shop — purchases and their deliveries.
 *
 *   participant: POST /api/users/me/shop/purchase { shopItemId }
 *                → spends XP (tracked via the user's spentXp counter, so the
 *                  earned XP / level / badges stay intact) and creates a
 *                  `pending` shop-order (an expected delivery).
 *   both:        GET  /api/users/me/shop/orders → PM sees the whole team's
 *                orders, a participant sees only their own.
 *   PM:          POST /api/users/me/shop/orders/:id/deliver
 *                → marks the delivery as received.
 *
 * Orders are shared via useState so the shop section and the PM deliveries
 * panel stay in sync without refetching.
 */
import type { ShopOrder, ShopOrderStatus } from '~/types/landing'

interface PurchaseResult {
  ok: boolean
  error?: string
  balance?: number
}

export function useShop() {
  const strapiBase = (useRuntimeConfig().public as any)?.strapi?.url ?? 'http://localhost:1337'
  const token = useStrapiToken()
  const { fetchUser } = useStrapiAuth()

  const orders = useState<ShopOrder[]>('fr-shop-orders', () => [])
  const loaded = useState<boolean>('fr-shop-orders-loaded', () => false)
  const loading = ref(false)

  const authHeaders = () =>
    token.value ? { Authorization: `Bearer ${token.value}` } : {}

  const fetchOrders = async (): Promise<void> => {
    if (!token.value) return
    loading.value = true
    try {
      const res = await $fetch<{ data: ShopOrder[] }>(
        `${strapiBase}/api/users/me/shop/orders`,
        { headers: authHeaders() },
      )
      orders.value = res?.data ?? []
      loaded.value = true
    } catch {
      /* keep whatever we had */
    } finally {
      loading.value = false
    }
  }

  /** Participant buys an item; refreshes own profile (XP/spentXp) + orders. */
  const purchase = async (shopItemId: string | number): Promise<PurchaseResult> => {
    if (!token.value || shopItemId == null || shopItemId === '') {
      return { ok: false, error: 'Не удалось оформить покупку' }
    }
    try {
      const res = await $fetch<{ ok: boolean; balance?: number }>(
        `${strapiBase}/api/users/me/shop/purchase`,
        { method: 'POST', body: { shopItemId }, headers: authHeaders() },
      )
      await fetchUser()
      await fetchOrders()
      return { ok: true, balance: res?.balance }
    } catch (e: any) {
      const msg = e?.data?.error?.message || e?.response?._data?.error?.message
      return { ok: false, error: msg || 'Не удалось оформить покупку' }
    }
  }

  /** PM marks a delivery as received; refreshes the orders list. */
  const deliver = async (id: number): Promise<boolean> => {
    if (!token.value || !id) return false
    try {
      await $fetch(`${strapiBase}/api/users/me/shop/orders/${id}/deliver`, {
        method: 'POST',
        headers: authHeaders(),
      })
      await fetchOrders()
      return true
    } catch {
      return false
    }
  }

  const pending = computed(() => orders.value.filter((o) => o.status === 'pending'))
  const delivered = computed(() => orders.value.filter((o) => o.status === 'delivered'))

  const statusLabel = (s: ShopOrderStatus) =>
    s === 'delivered' ? 'Получено' : 'Ожидает доставки'

  return { orders, pending, delivered, loading, loaded, fetchOrders, purchase, deliver, statusLabel }
}
