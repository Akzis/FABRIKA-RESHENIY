<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import type { UserProfile } from '~/types/user'

const user = useStrapiUser<UserProfile>()
const u = computed(() => user.value)
const strapiBase = (useRuntimeConfig().public as any)?.strapi?.url ?? 'http://localhost:1337'

const isPm = computed(() => u.value?.teamRole === 'pm')
const xp = computed(() => u.value?.xp ?? 0)
const fmt = (n: number) => n.toLocaleString('ru-RU').replace(/,/g, ' ')

interface ShopItem {
  id: string
  title: string
  description: string
  price: number
  image: string
  tag: string
}

const fallbackShopItems: ShopItem[] = [
  {
    id: 'keychain-dino',
    title: 'Воксельный брелок',
    description: 'Фирменный мини-динозавр для ключей или рюкзака.',
    price: 180,
    image: '/voxel/dino.png',
    tag: 'мерч',
  },
  {
    id: 'stickerpack',
    title: 'Стикерпак',
    description: 'Набор наклеек с иконками Фабрики решений.',
    price: 120,
    image: '/voxel/chat.png',
    tag: 'быстро',
  },
  {
    id: 'mug',
    title: 'Кружка',
    description: 'Кружка для кофе, чая и сложных дейли-челленджей.',
    price: 420,
    image: '/voxel/mug.png',
    tag: 'хит',
  },
  {
    id: 'notepad',
    title: 'Блокнот',
    description: 'Для идей, схем и планов на следующий спринт.',
    price: 260,
    image: '/voxel/notepad.png',
    tag: 'офис',
  },
  {
    id: 'keycaps',
    title: 'Кейкапы',
    description: 'Акцентные клавиши для тех, кто закрыл хард.',
    price: 650,
    image: '/voxel/keycaps.png',
    tag: 'rare',
  },
]

const shopItems = ref<ShopItem[]>([...fallbackShopItems])
const shopNotice = ref<string | null>(null)
const shopError = ref(false)

// Shop behaves like a collapsible mini-app — the participant can hide it and
// the open/closed state is remembered across reloads. The open/close is driven
// by a GSAP height + stagger timeline (see runCollapse).
const shopOpen = ref(true)
const collapseEl = ref<HTMLElement | null>(null)
let gsapLib: any = null
let collapseTl: any = null

const runCollapse = (open: boolean, instant = false) => {
  const el = collapseEl.value
  if (!el) return

  // No GSAP (SSR-safe / reduced motion) or first paint → jump to final state.
  if (!gsapLib || instant) {
    el.style.overflow = open ? 'visible' : 'hidden'
    el.style.height = open ? 'auto' : '0px'
    el.style.opacity = open ? '1' : '0'
    return
  }

  const gsap = gsapLib
  collapseTl?.kill()
  const cards = el.querySelectorAll('.shop-item')

  if (open) {
    gsap.set(el, { display: 'block', overflow: 'hidden' })
    collapseTl = gsap.timeline()
      .fromTo(el, { height: 0, opacity: 0 }, { height: 'auto', opacity: 1, duration: 0.5, ease: 'power3.out' })
      .from(cards, {
        y: 26, opacity: 0, scale: 0.96,
        duration: 0.45, ease: 'back.out(1.5)',
        stagger: { each: 0.05, from: 'start' },
        clearProps: 'transform,opacity',
      }, '-=0.34')
      .set(el, { overflow: 'visible', height: 'auto' })
  } else {
    gsap.set(el, { overflow: 'hidden' })
    collapseTl = gsap.timeline()
      .to(cards, {
        y: 14, opacity: 0, scale: 0.97,
        duration: 0.26, ease: 'power2.in',
        stagger: { each: 0.035, from: 'end' },
      })
      .to(el, { height: 0, opacity: 0, duration: 0.4, ease: 'power3.inOut' }, '-=0.12')
  }
}

const toggleShop = () => {
  shopOpen.value = !shopOpen.value
  try { localStorage.setItem('shopOpen', shopOpen.value ? '1' : '0') } catch { /* no-op */ }
  runCollapse(shopOpen.value)
}

// Balance is server-driven: total earned XP minus what's already been spent in
// the shop. Spending never lowers `xp`, so level/badges stay intact.
const spentXp = computed(() => u.value?.spentXp ?? 0)
const shopBalance = computed(() => Math.max(0, xp.value - spentXp.value))

// Purchases create deliveries; a participant sees their own here.
const { pending: pendingOrders, delivered: deliveredOrders, fetchOrders, purchase, statusLabel } = useShop()
const buyingId = ref<string | null>(null)
const canBuyShopItem = (item: ShopItem) => !buyingId.value && shopBalance.value >= item.price

const fmtDate = (iso?: string | null) => {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleString('ru-RU', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
  } catch { return '' }
}

const buyShopItem = async (item: ShopItem) => {
  if (isPm.value || buyingId.value) return
  if (shopBalance.value < item.price) {
    shopError.value = true
    shopNotice.value = `Не хватает ${fmt(item.price - shopBalance.value)} XP`
    return
  }
  buyingId.value = item.id
  shopNotice.value = null
  try {
    const res = await purchase(item.id)
    if (res.ok) {
      shopError.value = false
      shopNotice.value = `«${item.title}» оформлен за ${fmt(item.price)} XP. Информация о получении доставки придёт вам на почту.`
    } else {
      shopError.value = true
      shopNotice.value = res.error ?? 'Не удалось оформить покупку'
    }
  } finally {
    buyingId.value = null
  }
}

const normalizeShopItem = (row: any): ShopItem | null => {
  const data = row?.attributes ?? row
  const title = String(data?.title ?? '').trim()
  const price = Number(data?.price ?? 0)
  const image = String(data?.image ?? '').trim()
  if (!title || !Number.isFinite(price) || price < 0 || !image) return null

  return {
    id: String(data?.slug ?? row?.documentId ?? row?.id ?? title),
    title,
    description: String(data?.description ?? ''),
    price,
    image,
    tag: String(data?.tag ?? 'мерч'),
  }
}

const loadShopItems = async () => {
  try {
    const res = await $fetch<{ data?: any[] }>(`${strapiBase}/api/shop-items`, {
      params: {
        'filters[isActive][$eq]': true,
        'sort[0]': 'order:asc',
        'pagination[limit]': 50,
      },
    })
    const items = (res.data ?? []).map(normalizeShopItem).filter(Boolean) as ShopItem[]
    shopItems.value = items.length ? items : [...fallbackShopItems]
  } catch {
    shopItems.value = [...fallbackShopItems]
  }
}

onMounted(async () => {
  try {
    const saved = localStorage.getItem('shopOpen')
    if (saved !== null) shopOpen.value = saved === '1'
  } catch { /* no-op */ }

  // Load GSAP unless the user prefers reduced motion.
  if (!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
    try {
      const mod = await import('gsap')
      gsapLib = (mod as any).gsap ?? (mod as any).default
    } catch { /* no-op — falls back to instant toggle */ }
  }

  // Apply the persisted state without animating on first paint.
  if (!shopOpen.value) runCollapse(false, true)

  await loadShopItems()
  await fetchOrders()
})

useReveal('.shop-mini', { y: 46, scale: 0.97, duration: 0.9 })
</script>

<template>
  <section id="shop" class="py-16 sm:py-[110px] relative">
    <div class="max-w-[1320px] mx-auto px-4 sm:px-8">
      <SectionHeader tag="Магазин за XP" tag-color="var(--color-cyan-brand)" sub="Трать заработанный опыт на мерч и приятные мелочи. Баланс уменьшается с каждой покупкой — копи XP, выполняя задания и челленджи.">
        <template #title>
          Трать <span class="text-cyan-brand">XP</span><br />с пользой
        </template>
      </SectionHeader>

      <!-- mini-app: collapsible shop window -->
      <div class="shop-mini" :class="{ 'is-closed': !shopOpen }">
        <div class="shop-bar">
          <span class="shop-top-label font-mono">Доступный баланс</span>
          <div class="shop-bar-right">
            <span class="shop-balance font-mono"><b>{{ fmt(shopBalance) }}</b> XP</span>
            <button
              type="button"
              class="shop-toggle font-mono"
              :aria-expanded="shopOpen"
              @click="toggleShop"
            >
              <span class="shop-toggle-chevron" :class="{ 'is-open': shopOpen }">▾</span>
              {{ shopOpen ? 'Скрыть' : 'Открыть' }}
            </button>
          </div>
        </div>

        <div ref="collapseEl" class="shop-collapse">
          <div class="shop-body">
            <div v-if="shopNotice" class="shop-notice font-mono" :class="{ 'is-error': shopError }">{{ shopNotice }}</div>

            <div class="shop-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <article
                v-for="item in shopItems"
                :key="item.id"
                class="shop-item"
              >
                <div class="shop-img-wrap">
                  <img :src="item.image" :alt="item.title" class="shop-img" loading="lazy" />
                </div>
                <div class="shop-info">
                  <div class="shop-meta">
                    <span class="shop-name font-mono">{{ item.title }}</span>
                    <span class="shop-tag font-mono">{{ item.tag }}</span>
                  </div>
                  <p class="shop-desc font-mono">{{ item.description }}</p>
                  <div class="shop-buy-row">
                    <span class="shop-price font-pix">{{ fmt(item.price) }} XP</span>
                    <button
                      v-if="!isPm"
                      type="button"
                      class="shop-buy font-mono"
                      :disabled="!canBuyShopItem(item)"
                      @click="buyShopItem(item)"
                    >
                      {{ buyingId === item.id ? 'Оформляем…' : shopBalance >= item.price ? 'Купить' : 'Не хватает' }}
                    </button>
                  </div>
                </div>
              </article>
            </div>
          </div>

          <!-- MY DELIVERIES (participant) -->
          <div v-if="!isPm && (pendingOrders.length || deliveredOrders.length)" class="shop-deliveries">
            <div class="shop-deliveries-head">
              <h3 class="font-pix">Мои доставки</h3>
              <p class="font-mono">Заказы передаются проектному менеджеру. Он отметит выдачу, когда вручит товар.</p>
            </div>

            <div v-if="pendingOrders.length" class="shop-orders">
              <div v-for="o in pendingOrders" :key="o.id" class="shop-order">
                <div class="shop-order-img-wrap">
                  <img v-if="o.itemImage" :src="o.itemImage" :alt="o.itemTitle" class="shop-order-img" loading="lazy" />
                </div>
                <div class="shop-order-info">
                  <span class="shop-order-name font-mono">{{ o.itemTitle }}</span>
                  <span class="shop-order-date font-mono">{{ fmtDate(o.createdAt) }} · {{ fmt(o.price) }} XP</span>
                </div>
                <span class="shop-order-status is-pending font-mono">{{ statusLabel(o.status) }}</span>
              </div>
            </div>

            <div v-if="deliveredOrders.length" class="shop-orders shop-orders-done">
              <div v-for="o in deliveredOrders" :key="o.id" class="shop-order is-done">
                <div class="shop-order-img-wrap">
                  <img v-if="o.itemImage" :src="o.itemImage" :alt="o.itemTitle" class="shop-order-img" loading="lazy" />
                </div>
                <div class="shop-order-info">
                  <span class="shop-order-name font-mono">{{ o.itemTitle }}</span>
                  <span class="shop-order-date font-mono">{{ fmtDate(o.deliveredAt) }} · {{ fmt(o.price) }} XP</span>
                </div>
                <span class="shop-order-status is-done font-mono">{{ statusLabel(o.status) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
/* ── mini-app ── */
.shop-mini {
  position: relative;
}

/* ── bar (mini-app header) + balance ── */
.shop-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 14px;
  margin-bottom: 18px;
}
.shop-bar-right {
  display: flex;
  align-items: center;
  gap: 12px;
}
.shop-toggle {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 12px;
  border-radius: 10px;
  border: 1px solid var(--color-line);
  background: var(--color-bg-3);
  color: var(--color-ink-2);
  font-size: 9px;
  letter-spacing: .1em;
  text-transform: uppercase;
  cursor: pointer;
  transition: border-color 150ms, color 150ms;
}
.shop-toggle:hover { border-color: var(--color-line-strong); color: var(--color-ink); }
.shop-toggle-chevron {
  display: inline-block;
  font-size: 11px;
  line-height: 1;
  transform: rotate(-90deg);
  transition: transform 200ms ease;
}
.shop-toggle-chevron.is-open { transform: rotate(0deg); }
.shop-top-label { font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--color-ink-3); }
.shop-balance {
  flex-shrink: 0;
  padding: 8px 12px;
  border-radius: 10px;
  border: 1px solid rgba(24, 239, 242, 0.35);
  background: rgba(24, 239, 242, 0.08);
  color: var(--color-cyan-brand);
  font-size: 11px;
  letter-spacing: .08em;
  text-transform: uppercase;
}
.shop-balance b { color: var(--color-ink); font-weight: 700; }

.shop-notice {
  margin-bottom: 16px;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid rgba(82, 242, 197, 0.3);
  background: rgba(82, 242, 197, 0.08);
  color: var(--color-mint-brand);
  font-size: 11px;
  line-height: 1.4;
}
.shop-notice.is-error {
  border-color: rgba(255, 117, 117, 0.35);
  background: rgba(255, 117, 117, 0.08);
  color: #ff7575;
}

/* ── item card ── */
.shop-item {
  display: grid;
  grid-template-columns: 72px minmax(0, 1fr);
  gap: 14px;
  align-items: center;
  padding: 14px;
  border: 1px solid var(--color-line);
  border-radius: 16px;
  background: var(--color-bg-3);
  transition: transform 180ms ease, border-color 180ms ease, opacity 180ms ease;
}
.shop-item:hover {
  transform: translateY(-2px);
  border-color: var(--color-line-strong);
}
.shop-item.is-bought {
  opacity: .78;
}
.shop-img-wrap {
  width: 72px;
  height: 72px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid var(--color-line);
  overflow: hidden;
}
.shop-img {
  width: 56px;
  height: 56px;
  object-fit: contain;
  filter: drop-shadow(0 8px 10px rgba(0, 0, 0, 0.35));
}
.shop-info {
  min-width: 0;
}
.shop-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 6px;
}
.shop-name {
  min-width: 0;
  color: var(--color-ink);
  font-size: 12px;
  letter-spacing: .04em;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.shop-tag {
  flex-shrink: 0;
  padding: 3px 7px;
  border-radius: 999px;
  background: rgba(181, 89, 243, 0.12);
  color: var(--color-purple-brand);
  font-size: 8px;
  letter-spacing: .12em;
  text-transform: uppercase;
}
.shop-desc {
  margin: 0 0 11px;
  color: var(--color-ink-3);
  font-size: 11px;
  line-height: 1.4;
}
.shop-buy-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}
.shop-price {
  flex-shrink: 0;
  color: var(--color-cyan-brand);
  font-size: 17px;
  line-height: 1;
}
.shop-buy {
  min-width: 96px;
  padding: 9px 12px;
  border-radius: 10px;
  border: 1px solid var(--color-cyan-brand);
  background: rgba(24, 239, 242, 0.08);
  color: var(--color-cyan-brand);
  font-size: 9px;
  letter-spacing: .08em;
  text-transform: uppercase;
  cursor: pointer;
  transition: background 150ms, border-color 150ms, color 150ms, opacity 150ms;
}
.shop-buy:hover:not(:disabled) {
  background: rgba(24, 239, 242, 0.16);
}
.shop-buy:disabled {
  opacity: .55;
  cursor: default;
}
.shop-buy.is-bought {
  border-color: var(--color-mint-brand);
  background: rgba(82, 242, 197, 0.1);
  color: var(--color-mint-brand);
  opacity: 1;
}

/* ── my deliveries ── */
.shop-deliveries {
  margin-top: 28px;
}
.shop-deliveries-head { margin-bottom: 16px; }
.shop-deliveries-head h3 { font-size: 18px; line-height: 1; color: var(--color-ink); margin: 0 0 6px; }
.shop-deliveries-head p { margin: 0; font-size: 11px; line-height: 1.4; color: var(--color-ink-3); }
.shop-orders {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.shop-orders-done { margin-top: 8px; }
.shop-order {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border: 1px solid var(--color-line);
  border-radius: 12px;
  background: var(--color-bg-3);
}
.shop-order.is-done { opacity: .7; }
.shop-order-img-wrap {
  flex-shrink: 0;
  width: 42px;
  height: 42px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid var(--color-line);
  overflow: hidden;
}
.shop-order-img { width: 32px; height: 32px; object-fit: contain; }
.shop-order-info { display: flex; flex-direction: column; gap: 2px; min-width: 0; flex: 1; }
.shop-order-name {
  color: var(--color-ink);
  font-size: 12px;
  letter-spacing: .04em;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.shop-order-date { font-size: 10px; color: var(--color-ink-3); }
.shop-order-status {
  flex-shrink: 0;
  padding: 5px 10px;
  border-radius: 999px;
  font-size: 9px;
  letter-spacing: .08em;
  text-transform: uppercase;
  border: 1px solid var(--color-line);
}
.shop-order-status.is-pending {
  color: var(--color-cyan-brand);
  border-color: rgba(24, 239, 242, 0.4);
  background: rgba(24, 239, 242, 0.08);
}
.shop-order-status.is-done {
  color: var(--color-mint-brand);
  border-color: rgba(82, 242, 197, 0.4);
  background: rgba(82, 242, 197, 0.08);
}

@media (max-width: 560px) {
  .shop-bar { flex-direction: column; align-items: flex-start; gap: 10px; }
  .shop-bar-right { width: 100%; justify-content: space-between; }
  .shop-buy-row { align-items: stretch; flex-direction: column; gap: 8px; }
  .shop-buy { width: 100%; }
}
</style>
