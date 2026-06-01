<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import type { ShopOrder } from '~/types/landing'

const { orders, pending, delivered, loading, fetchOrders, deliver, statusLabel } = useShop()

onMounted(() => { void fetchOrders() })

// Pending deliveries grouped by participant, so the PM sees who's waiting.
interface Group { id: number; name: string; orders: ShopOrder[]; total: number }
const pendingGroups = computed<Group[]>(() => {
  const map = new Map<number, Group>()
  for (const o of pending.value) {
    const id = o.participant?.id ?? 0
    const name = o.participant?.name ?? 'Участник'
    let g = map.get(id)
    if (!g) { g = { id, name, orders: [], total: 0 }; map.set(id, g) }
    g.orders.push(o)
    g.total += o.price ?? 0
  }
  return [...map.values()].sort((a, b) => b.orders.length - a.orders.length)
})

const busy = ref<Set<number>>(new Set())
const isBusy = (id: number) => busy.value.has(id)

const markDelivered = async (o: ShopOrder) => {
  if (isBusy(o.id)) return
  busy.value = new Set(busy.value).add(o.id)
  try {
    await deliver(o.id)
  } finally {
    const next = new Set(busy.value); next.delete(o.id); busy.value = next
  }
}

const fmt = (n: number) => n.toLocaleString('ru-RU').replace(/,/g, ' ')
const fmtDate = (iso?: string | null) => {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleString('ru-RU', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
  } catch { return '' }
}
</script>

<template>
  <section id="deliveries" class="py-16 sm:py-[90px] relative scroll-mt-24">
    <div class="max-w-[1100px] mx-auto px-4 sm:px-8">
      <SectionHeader tag="Доставки" tag-color="var(--color-purple-brand)" sub="Участники тратят XP в магазине — здесь видно, кому и что нужно выдать. Когда участник получил товар, отметь доставку как выданную.">
        <template #title>
          Выдача <span class="text-purple-brand">наград</span>
        </template>
      </SectionHeader>

      <!-- pending deliveries, grouped by participant -->
      <div class="flex items-center justify-between mb-5">
        <h4 class="font-mono text-[11px] tracking-[0.14em] text-ink-3 uppercase m-0 flex items-center gap-2.5 before:content-[''] before:w-2 before:h-2 before:bg-purple-brand">
          Ожидают выдачи
          <span v-if="pending.length" class="text-purple-brand">· {{ pending.length }}</span>
        </h4>
        <button type="button" class="font-mono text-[10px] tracking-[0.1em] uppercase text-ink-3 hover:text-ink-2" :disabled="loading" @click="fetchOrders()">
          {{ loading ? 'Обновляем…' : 'Обновить' }}
        </button>
      </div>

      <p v-if="!pending.length" class="text-sm text-ink-3 py-10 text-center bg-bg-2 border border-line rounded-[18px]">
        Нет товаров, ожидающих выдачи.
      </p>

      <div v-else class="flex flex-col gap-4">
        <div
          v-for="g in pendingGroups"
          :key="g.id"
          class="bg-bg-2 border border-line rounded-[18px] p-6"
        >
          <div class="flex items-center gap-3 flex-wrap mb-4">
            <div class="flex-1 min-w-[160px]">
              <div class="text-[15px] font-semibold text-ink">{{ g.name }}</div>
              <div class="font-mono text-[11px] text-ink-3 mt-1">
                {{ g.orders.length }} {{ g.orders.length === 1 ? 'товар' : 'товаров' }} · {{ fmt(g.total) }} XP
              </div>
            </div>
          </div>

          <div class="flex flex-col gap-2.5">
            <div
              v-for="o in g.orders"
              :key="o.id"
              class="flex items-center gap-3 bg-bg-3 border border-line rounded-xl p-3"
            >
              <div class="shrink-0 w-11 h-11 rounded-[10px] flex items-center justify-center bg-white/[0.04] border border-line overflow-hidden">
                <img v-if="o.itemImage" :src="o.itemImage" :alt="o.itemTitle" class="w-8 h-8 object-contain" loading="lazy" />
              </div>
              <div class="flex-1 min-w-0">
                <div class="text-[14px] text-ink truncate">{{ o.itemTitle }}</div>
                <div class="font-mono text-[11px] text-ink-3 mt-0.5">{{ fmtDate(o.createdAt) }} · {{ fmt(o.price) }} XP</div>
              </div>
              <button type="button" class="dv-btn dv-deliver font-mono" :disabled="isBusy(o.id)" @click="markDelivered(o)">
                {{ isBusy(o.id) ? 'Отмечаем…' : 'Получено' }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- delivered history -->
      <div v-if="delivered.length" class="mt-12">
        <h4 class="font-mono text-[11px] tracking-[0.14em] text-ink-3 uppercase m-0 mb-5 flex items-center gap-2.5 before:content-[''] before:w-2 before:h-2 before:bg-mint-brand">
          Выданные
        </h4>
        <div class="flex flex-col gap-2.5">
          <div
            v-for="o in delivered"
            :key="o.id"
            class="bg-bg-2 border border-line rounded-xl p-4 flex items-center gap-3 flex-wrap"
          >
            <span class="shrink-0 inline-flex items-center font-mono text-[9px] tracking-[0.1em] uppercase px-2 py-0.5 rounded-full border text-mint-brand border-[rgba(82,242,197,0.4)] bg-[rgba(82,242,197,0.08)]">
              {{ statusLabel(o.status) }}
            </span>
            <div class="flex-1 min-w-[160px]">
              <span class="text-[14px] text-ink">{{ o.itemTitle }}</span>
              <span class="font-mono text-[11px] text-ink-3"> · {{ o.participant?.name ?? 'Участник' }}</span>
            </div>
            <span class="font-mono text-[11px] text-ink-3 shrink-0">{{ fmtDate(o.deliveredAt) }}</span>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.dv-btn {
  flex-shrink: 0;
  padding: 8px 16px;
  border-radius: 10px;
  font-size: 10px;
  letter-spacing: .08em;
  text-transform: uppercase;
  cursor: pointer;
  border: 1px solid transparent;
  transition: transform 150ms, opacity 150ms, background 150ms;
}
.dv-btn:disabled { opacity: .5; cursor: progress; }
.dv-btn:hover:not(:disabled) { transform: translateY(-1px); }
.dv-deliver { background: var(--color-mint-brand); color: var(--color-btn-ink); }
</style>
