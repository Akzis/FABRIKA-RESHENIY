<script setup lang="ts">
import { computed, ref } from 'vue'
import type { UserProfile } from '~/types/user'
import type { LeaderboardRow } from '~/types/landing'

const { leaderboard } = useLandingData()
const user = useStrapiUser() as unknown as { value: UserProfile | null }

const periods = ['Сегодня', 'Неделя', 'Сезон']
const activePeriod = ref(0)

const rankColor = (rank: number) => {
  if (rank === 1) return 'text-cyan-brand'
  if (rank === 2) return 'text-mint-brand'
  if (rank === 3) return 'text-purple-brand'
  return 'text-ink-3'
}

const me = computed(() => user.value)
const myId = computed(() => (me.value?.id ?? null) as number | null)
const myIsMember = computed(() => (me.value?.teamRole ?? 'member') === 'member')
const myXp = computed(() => Number(me.value?.xp ?? 0))

const fmt = (n: number) => n.toLocaleString('ru-RU').replace(/,/g, ' ')

/**
 * Rows displayed in the table:
 *  - Live top-N members from /api/users (already in `leaderboard` store)
 *  - If the current user is a member but is outside that top-N, append a
 *    pinned "me" row with computed rank.
 *  - If they're a PM, no extra row — PMs don't enter the leaderboard.
 */
const rows = computed<LeaderboardRow[]>(() => {
  const top = leaderboard.value ?? []
  const meRow = top.find(r => r.userId != null && r.userId === myId.value)

  // Mark the current user inside top-N
  const decorated = top.map(r => r.userId === myId.value ? { ...r, me: true } : r)
  if (meRow || !myIsMember.value || !me.value) return decorated

  // Append a pinned row for me, with rank = top.length + 1 (approximation).
  // For an exact rank you'd query "count of users with xp > myXp" — kept
  // simple for now since the front already has the top window.
  const myName = me.value.displayName || me.value.username || 'Игрок'
  return [
    ...decorated,
    {
      rank: (top[top.length - 1]?.rank ?? 0) + 1,
      userId: myId.value ?? undefined,
      name: myName,
      team: me.value.team ? `${me.value.team} · участник` : 'без команды',
      level: `LVL ${me.value.level ?? 1}`,
      closed: `${me.value.challengesClosed ?? 0} закрыто`,
      xp: fmt(myXp.value),
      gradient: 'linear-gradient(135deg, #18EFF2, #B559F3)',
      initial: (myName[0] ?? '?').toUpperCase(),
      me: true,
    },
  ]
})

const emptyState = computed(() => rows.value.length === 0)

useReveal('.lb-side', { x: -50, y: 0, duration: 0.9 })
useReveal('.lb-row:not(.header)', { stagger: 0.08, x: 60, y: 0, duration: 0.7, ease: 'power3.out' })
useGlowPulse('.lb-row.top1', { color: 'rgba(24, 239, 242, 0.35)', spread: 28, duration: 2.4 })
</script>

<template>
  <section id="leaderboard" class="py-[110px] relative">
    <div class="max-w-[1320px] mx-auto px-8">
      <SectionHeader tag="Рейтинг" tag-color="var(--color-mint-brand)" sub="Топ участников обновляется в реальном времени по факту закрытия челленджей. Никаких ручных правок и любимчиков. Проектные менеджеры в рейтинг не входят.">
        <template #title>
          Автоматический<br /><span class="text-mint-brand">leaderboard</span>
        </template>
      </SectionHeader>

      <div class="grid grid-cols-1 lg:grid-cols-[1fr_1.6fr] gap-7">
        <div class="lb-side bg-bg-2 border border-line rounded-[22px] p-8 flex flex-col gap-5 min-h-[480px]">
          <span class="inline-flex items-center gap-2 font-mono text-[11px] text-mint-brand tracking-[0.1em] uppercase">
            <i class="w-2 h-2 bg-mint-brand rounded-full shadow-[0_0_8px_var(--color-mint-brand)] animate-pulse-soft"></i>
            Live · из базы пользователей
          </span>
          <h3 class="font-pix text-[40px] leading-[0.95] m-0 uppercase">
            Кто <span class="text-mint-brand">впереди</span> сегодня?
          </h3>
          <p class="text-ink-2 text-sm leading-[1.55] m-0">
            Сортировка по XP. В рейтинг попадают только участники команд — PM ведут команды, поэтому их XP не учитывается.
            Топ-3 каждой недели получают бонусы +50% к XP.
          </p>
          <div class="flex gap-1.5 mt-auto">
            <button
              v-for="(p, i) in periods"
              :key="p"
              @click="activePeriod = i"
              :class="[
                'flex-1 p-2.5 rounded-lg border font-mono text-xs tracking-[0.08em] uppercase cursor-pointer transition-all duration-150',
                activePeriod === i ? 'bg-cyan-brand text-btn-ink border-cyan-brand' : 'bg-bg-3 text-ink-3 border-line',
              ]"
            >
              {{ p }}
            </button>
          </div>
        </div>

        <div class="bg-bg-2 border border-line rounded-[22px] p-5">
          <div class="hidden md:grid grid-cols-[56px_1fr_100px_110px_90px] gap-[18px] items-center font-mono text-[10px] tracking-[0.14em] text-ink-3 uppercase py-2 px-[18px] pb-3.5 border-b border-line lb-row header">
            <span>Ранг</span>
            <span>Игрок · команда</span>
            <span>Уровень</span>
            <span>Челленджей</span>
            <span class="text-right">XP всего</span>
          </div>

          <!-- empty state -->
          <div v-if="emptyState" class="py-16 text-center">
            <p class="font-mono text-[12px] text-ink-3 uppercase tracking-[0.14em] m-0">
              Пока в рейтинге пусто
            </p>
            <p class="text-sm text-ink-2 m-0 mt-3">
              Зарегистрируй первого участника команды — и он окажется на первой строке.
            </p>
          </div>

          <!-- rows -->
          <div
            v-for="row in rows"
            :key="(row.userId ?? row.name) + '-' + row.rank"
            :class="[
              'lb-row grid grid-cols-[56px_1fr_100px_110px_90px] gap-[18px] items-center py-3.5 px-[18px] rounded-xl transition-colors duration-150 hover:bg-bg-3',
              row.rank === 1 ? 'top1' : '',
              row.me ? 'bg-[rgba(24,239,242,0.06)] border border-[rgba(24,239,242,0.25)]' : '',
            ]"
          >
            <span :class="['font-pix text-[28px] w-14', rankColor(row.rank), row.me ? 'text-cyan-brand' : '']">
              {{ String(row.rank).padStart(2, '0') }}
            </span>
            <div class="flex gap-3.5 items-center">
              <div
                class="w-[38px] h-[38px] rounded-[10px] font-pix text-white text-lg flex items-center justify-center"
                :style="{ background: row.gradient }"
              >
                {{ row.initial }}
              </div>
              <div>
                <div class="text-sm font-semibold">{{ row.name }}<span v-if="row.me" class="ml-2 text-cyan-brand text-[11px] font-mono tracking-[0.08em] uppercase">это ты</span></div>
                <div class="font-mono text-[11px] text-ink-3">{{ row.team }}</div>
              </div>
            </div>
            <span class="font-mono text-[12px] text-ink-2">{{ row.level }}</span>
            <span class="font-mono text-[12px] text-ink-2">{{ row.closed }}</span>
            <span :class="['font-pix text-[22px] text-right', row.rank === 1 ? 'text-cyan-brand' : 'text-ink']">
              {{ row.xp }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
