<script setup lang="ts">
import { computed } from 'vue'
import type { UserProfile } from '~/types/user'

const { daily } = useLandingData()
const user = useStrapiUser() as unknown as { value: UserProfile | null }

// ── derived profile data ───────────────────────────────────────────────
const u = computed(() => user.value)

const displayName = computed(() => u.value?.displayName || u.value?.username || 'Игрок')
const initial = computed(() => (displayName.value[0] ?? '?').toUpperCase())
const roleLabel = computed(() => u.value?.teamRole === 'pm' ? 'PM' : 'участник')
const teamLine = computed(() =>
  u.value?.team ? `${roleLabel.value} команды «${u.value.team}»` : 'роль не назначена'
)

const lvl = computed(() => u.value?.level ?? 1)
const xp = computed(() => u.value?.xp ?? 0)
const xpToNext = computed(() => Math.max(u.value?.xpToNextLevel ?? 100, 1))
const xpTotal = computed(() => xp.value + xpToNext.value) // approximate "level total"
const xpPercent = computed(() => Math.min(100, Math.round((xp.value / xpTotal.value) * 100)))

const streak = computed(() => u.value?.streak ?? 0)
const streakPercent = computed(() => Math.min(100, Math.round((streak.value / 30) * 100))) // 30 = goal

const cupPlace = computed(() => u.value?.teamCupPlace ?? 0)
const cupCurrent = computed(() => u.value?.teamCupCurrent ?? 0)
const cupTotal = computed(() => Math.max(u.value?.teamCupTotal ?? 10000, 1))
const cupPercent = computed(() => Math.min(100, Math.round((cupCurrent.value / cupTotal.value) * 100)))

const challengesClosed = computed(() => u.value?.challengesClosed ?? 0)
const badgesCount = computed(() => u.value?.badgesCount ?? 0)

// ── week + daily completion (per user) ─────────────────────────────────

// Generate week strip from streak count (simple: last N days done, today is dim).
const weekDays = computed(() => {
  const labels = ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс']
  const today = ((new Date().getDay() + 6) % 7) // Mon=0 .. Sun=6
  const doneCount = Math.min(streak.value, today)
  return labels.map((d, i) => {
    if (i === today) return { d, state: 'today' as const }
    if (i < today && (today - i) <= doneCount) return { d, state: 'done' as const }
    return { d, state: 'none' as const }
  })
})

const weekNumber = computed(() => {
  const d = new Date()
  const start = new Date(d.getFullYear(), 0, 1)
  const days = Math.floor((d.getTime() - start.getTime()) / 86_400_000)
  return Math.ceil((days + start.getDay() + 1) / 7)
})

const completedQuestIds = computed(() => {
  const list = u.value?.completedDailyQuests
  if (!Array.isArray(list)) return new Set<number>()
  return new Set(list.map((q: any) => q.id))
})

// formatter for nice "3 420" style numbers
const fmt = (n: number) => n.toLocaleString('ru-RU').replace(/,/g, ' ')

useReveal('.dash-reveal', { stagger: 0.14, y: 50, scale: 0.97, blur: 4, duration: 1.0 })
useReveal('.stat-card', { stagger: 0.08, y: 24, scale: 0.85, duration: 0.7, ease: 'back.out(1.7)', trigger: '.dash-reveal' })
useReveal('.dash-day', { stagger: 0.06, scale: 0.5, y: 0, duration: 0.5, ease: 'back.out(2)', trigger: '.dash-reveal' })
useReveal('.dash-quest', { stagger: 0.08, x: -30, y: 0, duration: 0.6, trigger: '.dash-reveal' })
useBarFill('.xp-bar > i', { stagger: 0.15, duration: 1.4 })
</script>

<template>
  <section id="progress" class="py-[110px] relative">
    <div class="max-w-[1320px] mx-auto px-8">
      <SectionHeader tag="Прогресс игрока" sub="Полный дашборд участника: уровень, кривая опыта, дейли-челленджи и магазин наград. Открыт после авторизации.">
        <template #title>
          Видно <span class="text-cyan-brand">всё</span>:<br />от XP<br />до серий
        </template>
      </SectionHeader>

      <div class="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-6">
        <!-- profile panel -->
        <div class="dash-reveal bg-bg-2 border border-line rounded-[22px] p-8">
          <h4 class="font-mono text-[11px] tracking-[0.14em] text-ink-3 uppercase m-0 mb-[22px] flex items-center gap-2.5 before:content-[''] before:w-2 before:h-2 before:bg-cyan-brand">
            Профиль игрока
          </h4>

          <div class="grid grid-cols-[64px_1fr_auto] gap-[18px] items-center mb-7">
            <div class="w-16 h-16 rounded-[14px] flex items-center justify-center font-pix text-[28px] text-white shadow-[0_0_0_1px_var(--color-line-strong)]" style="background: linear-gradient(135deg, var(--color-purple-brand), var(--color-cyan-brand));">{{ initial }}</div>
            <div>
              <div class="font-pix text-[28px] leading-[1.1]">{{ displayName }}</div>
              <div class="font-mono text-[11px] tracking-[0.1em] text-ink-3 uppercase mt-1">{{ teamLine }}</div>
            </div>
            <div class="font-pix text-[20px] text-btn-ink bg-cyan-brand py-1.5 px-3.5 rounded-lg">LVL {{ lvl }}</div>
          </div>

          <div class="mb-[18px]">
            <div class="flex justify-between font-mono text-[12px] text-ink-2 mb-2">
              <span>Опыт до {{ lvl + 1 }} уровня</span><span><b class="text-ink">{{ fmt(xp) }}</b> / {{ fmt(xpTotal) }} XP</span>
            </div>
            <div class="xp-bar h-3.5 bg-bg-3 rounded-full overflow-hidden relative">
              <i class="block h-full rounded-full bg-gradient-to-r from-cyan-brand to-mint-brand shadow-[0_0_12px_rgba(24,239,242,0.4)]" :style="{ width: xpPercent + '%' }"></i>
            </div>
          </div>
          <div class="mb-[18px]">
            <div class="flex justify-between font-mono text-[12px] text-ink-2 mb-2">
              <span>Дейли-серия</span><span><b class="text-ink">{{ streak }}</b> {{ streak === 1 ? 'день' : 'дней' }}</span>
            </div>
            <div class="xp-bar h-3.5 bg-bg-3 rounded-full overflow-hidden relative">
              <i class="block h-full rounded-full bg-mint-brand" :style="{ width: streakPercent + '%' }"></i>
            </div>
          </div>
          <div class="mb-[18px]">
            <div class="flex justify-between font-mono text-[12px] text-ink-2 mb-2">
              <span>Кубок команды</span>
              <span>
                <template v-if="cupPlace > 0"><b class="text-ink">{{ cupPlace }} место</b> · </template>
                {{ fmt(cupCurrent) }} / {{ fmt(cupTotal) }}
              </span>
            </div>
            <div class="xp-bar h-3.5 bg-bg-3 rounded-full overflow-hidden relative">
              <i class="block h-full rounded-full" :style="{ width: cupPercent + '%', background: 'linear-gradient(90deg, var(--color-purple-brand), #d28bff)' }"></i>
            </div>
          </div>

          <div class="grid grid-cols-3 gap-3 mt-6">
            <div class="stat-card p-4 bg-bg-3 rounded-xl">
              <div class="font-pix text-[30px] leading-none text-cyan-brand">{{ challengesClosed }}</div>
              <div class="font-mono text-[10px] tracking-[0.1em] text-ink-3 uppercase mt-1.5">челленджей</div>
            </div>
            <div class="stat-card p-4 bg-bg-3 rounded-xl">
              <div class="font-pix text-[30px] leading-none text-mint-brand">{{ badgesCount }}</div>
              <div class="font-mono text-[10px] tracking-[0.1em] text-ink-3 uppercase mt-1.5">бейджей</div>
            </div>
            <div class="stat-card p-4 bg-bg-3 rounded-xl">
              <div class="font-pix text-[30px] leading-none text-purple-brand">{{ fmt(xp) }}</div>
              <div class="font-mono text-[10px] tracking-[0.1em] text-ink-3 uppercase mt-1.5">всего XP</div>
            </div>
          </div>
        </div>

        <!-- daily panel -->
        <div class="dash-reveal bg-bg-2 border border-line rounded-[22px] p-8">
          <h4 class="font-mono text-[11px] tracking-[0.14em] text-ink-3 uppercase m-0 mb-[22px] flex items-center gap-2.5 before:content-[''] before:w-2 before:h-2 before:bg-cyan-brand">
            Дейли · неделя {{ weekNumber }}
          </h4>

          <div class="flex gap-2 mb-[22px]">
            <div
              v-for="(d, i) in weekDays"
              :key="i"
              :class="[
                'dash-day flex-1 aspect-[0.95] rounded-[10px] border flex flex-col items-center justify-center font-mono text-[11px] relative',
                d.state === 'done' ? 'bg-[rgba(82,242,197,0.12)] border-mint-brand text-mint-brand' : '',
                d.state === 'today' ? 'bg-cyan-brand text-btn-ink border-cyan-brand font-bold' : '',
                d.state === 'none' ? 'bg-bg-3 border-line text-ink-3' : '',
              ]"
            >
              <span class="font-pix text-[18px]">{{ d.d }}</span>
              <span v-if="d.state === 'today'" class="font-mono text-[9px] mt-1">today</span>
              <span v-if="d.state === 'done'" class="font-pix text-[20px] absolute bottom-1 right-1.5 text-mint-brand">✓</span>
            </div>
          </div>

          <div class="flex flex-col gap-2.5">
            <div
              v-for="(q, i) in daily"
              :key="i"
              class="dash-quest flex gap-3.5 items-center py-3.5 px-4 border border-line rounded-xl bg-bg-3"
            >
              <div
                :class="[
                  'w-[22px] h-[22px] rounded-md border-[1.5px] flex items-center justify-center shrink-0',
                  completedQuestIds.has((q as any).id) ? 'bg-mint-brand border-mint-brand text-btn-ink font-bold' : 'border-line-strong',
                ]"
              >
                <span v-if="completedQuestIds.has((q as any).id)">✓</span>
              </div>
              <div :class="['text-sm flex-1', completedQuestIds.has((q as any).id) ? 'text-ink-3 line-through' : '']">{{ q.title }}</div>
              <div :class="['font-pix text-[18px]', completedQuestIds.has((q as any).id) ? 'text-ink-3' : 'text-cyan-brand']">+{{ q.points }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
