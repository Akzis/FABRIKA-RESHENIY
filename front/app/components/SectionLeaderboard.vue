<script setup lang="ts">
import { computed, ref } from 'vue'
import type { UserProfile } from '~/types/user'
import type { LeaderboardRow, TeamLeaderboardRow } from '~/types/landing'

const { leaderboard, teamLeaderboard } = useLandingData()
const user = useStrapiUser() as unknown as { value: UserProfile | null }
const { avatarUrl: myAvatarUrl } = useUserAvatar()

// Что показываем в рейтинге — отдельных игроков или команды целиком.
type Scope = 'players' | 'teams'
const scope = ref<Scope>('players')
const scopes: { key: Scope; label: string }[] = [
  { key: 'players', label: 'Игроки' },
  { key: 'teams', label: 'Команды' },
]

// Сортировка рейтинга: по XP, по закрытым челленджам или по серии (стрику).
// «По стрику» применимо только к игрокам — у команд стрика нет.
type SortKey = 'xp' | 'closed' | 'streak'
const allSorts: { key: SortKey; label: string }[] = [
  { key: 'xp', label: 'По XP' },
  { key: 'closed', label: 'По челленджам' },
  { key: 'streak', label: 'По стрику' },
]
const sorts = computed(() =>
  scope.value === 'teams' ? allSorts.filter(s => s.key !== 'streak') : allSorts,
)
const activeSort = ref<SortKey>('xp')
// При переключении на команды сбрасываем неприменимый «стрик» на XP.
const setScope = (s: Scope) => {
  scope.value = s
  if (s === 'teams' && activeSort.value === 'streak') activeSort.value = 'xp'
}

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

// ── Tile = avatar photo (fallback: gradient + initial) ──────────────────────
const tileStyle = (row: LeaderboardRow) =>
  row.avatarUrl ? { background: '#0b0b0e' } : { background: '#fff' }

// ── Row banner = the player's profileHeader (color + positioned voxel art),
//    rendered exactly like the profile header card. ───────────────────────────
const isLight = (hex?: string | null) => {
  if (!hex || !/^#[0-9a-f]{6}$/i.test(hex)) return false
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return (r * 0.299 + g * 0.587 + b * 0.114) > 150
}
const hasBanner = (row: LeaderboardRow) => !!row.headerColor
const rowStyle = (row: LeaderboardRow) => {
  if (!row.headerColor) return {}
  const dark = !isLight(row.headerColor)
  const overlay = dark
    ? 'linear-gradient(120deg, rgba(255,255,255,.10), rgba(255,255,255,.02))'
    : 'linear-gradient(120deg, rgba(255,255,255,.72), rgba(255,255,255,.20))'
  return {
    background: `${overlay}, ${row.headerColor}`,
    '--lb-ink': dark ? '#ffffff' : '#11131c',
    '--lb-muted': dark ? 'rgba(255,255,255,.72)' : 'rgba(17,19,28,.58)',
  } as Record<string, string>
}
const rowArtStyle = (row: LeaderboardRow) => ({
  left: `${row.headerImageX ?? 50}%`,
  top: `${row.headerImageY ?? 50}%`,
  width: `${row.headerImageSize ?? 100}px`,
  height: `${row.headerImageSize ?? 100}px`,
})
// When a banner is on, force text onto the banner ink palette for readability.
const ink = (row: LeaderboardRow, strong = true) =>
  row.headerColor ? { color: strong ? 'var(--lb-ink)' : 'var(--lb-muted)' } : {}

/**
 * Rows displayed in the table:
 *  - Live top-N members from /api/users (already in `leaderboard` store)
 *  - If the current user is a member but is outside that top-N, append a
 *    pinned "me" row with computed rank.
 *  - If they're a PM, no extra row — PMs don't enter the leaderboard.
 */
const baseRows = computed<LeaderboardRow[]>(() => {
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
      xpValue: myXp.value,
      closedValue: Number(me.value.challengesClosed ?? 0),
      streak: Number(me.value.streak ?? 0),
      gradient: 'linear-gradient(135deg, #18EFF2, #B559F3)',
      initial: (myName[0] ?? '?').toUpperCase(),
      avatarUrl: myAvatarUrl.value,
      headerColor: typeof me.value.profileHeader?.color === 'string' ? me.value.profileHeader.color : null,
      headerImage: typeof me.value.profileHeader?.image === 'string' && me.value.profileHeader.image ? me.value.profileHeader.image : null,
      headerImageX: Number.isFinite(me.value.profileHeader?.imageX) ? me.value.profileHeader!.imageX : 50,
      headerImageY: Number.isFinite(me.value.profileHeader?.imageY) ? me.value.profileHeader!.imageY : 50,
      headerImageSize: Number.isFinite(me.value.profileHeader?.imageSize) ? me.value.profileHeader!.imageSize : 100,
      me: true,
    },
  ]
})

// Sort by the active metric (desc) and recompute the displayed rank so the
// «01, 02, 03…» column always matches the chosen ordering.
const metric = (r: LeaderboardRow): number => {
  if (activeSort.value === 'closed') return r.closedValue ?? 0
  if (activeSort.value === 'streak') return r.streak ?? 0
  return r.xpValue ?? 0
}
const rows = computed<LeaderboardRow[]>(() =>
  [...baseRows.value]
    .sort((a, b) => metric(b) - metric(a))
    .map((r, i) => ({ ...r, rank: i + 1 })),
)

// Team rows — sorted by the active metric (xp/closed) and re-ranked, mirroring
// the player table. Streak doesn't apply to teams, so it falls back to XP.
const teamMetric = (t: TeamLeaderboardRow): number =>
  activeSort.value === 'closed' ? t.closedValue : t.xpValue
const teamRows = computed<TeamLeaderboardRow[]>(() =>
  [...(teamLeaderboard.value ?? [])]
    .sort((a, b) => teamMetric(b) - teamMetric(a))
    .map((t, i) => ({ ...t, rank: i + 1 })),
)

const emptyState = computed(() =>
  scope.value === 'teams' ? teamRows.value.length === 0 : rows.value.length === 0,
)

useReveal('.lb-side', { x: -50, y: 0, duration: 0.9 })
useReveal('.lb-row:not(.header)', { stagger: 0.08, x: 60, y: 0, duration: 0.7, ease: 'power3.out' })
useGlowPulse('.lb-row.top1', { color: 'rgba(24, 239, 242, 0.35)', spread: 28, duration: 2.4 })
</script>

<template>
  <section id="leaderboard" class="py-16 sm:py-[110px] relative">
    <div class="max-w-[1320px] mx-auto px-4 sm:px-8">
      <SectionHeader tag="Рейтинг" tag-color="var(--color-mint-brand)" sub="Топ участников обновляется в реальном времени по факту закрытия челленджей. Никаких ручных правок и любимчиков. Проектные менеджеры в рейтинг не входят.">
        <template #title>
          Автоматический<br /><span class="text-mint-brand">leaderboard</span>
        </template>
      </SectionHeader>

      <div class="grid grid-cols-1 lg:grid-cols-[1fr_1.6fr] gap-5 lg:gap-7">
        <div class="lb-side bg-bg-2 border border-line rounded-[22px] p-5 sm:p-8 flex flex-col gap-5 lg:min-h-[480px]">
          <span class="inline-flex items-center gap-2 font-mono text-[11px] text-mint-brand tracking-[0.1em] uppercase">
            <i class="w-2 h-2 bg-mint-brand rounded-full shadow-[0_0_8px_var(--color-mint-brand)] animate-pulse-soft"></i>
            Live · из базы пользователей
          </span>
          <h3 class="font-pix text-[40px] leading-[0.95] m-0 uppercase">
            Кто <span class="text-mint-brand">впереди</span> прямо сейчас?
          </h3>
          <p class="text-ink-2 text-sm leading-[1.55] m-0">
            Один живой рейтинг, который можно смотреть как удобно: по общему XP,
            по числу закрытых челленджей или по серии активных дней (стрику).
            В рейтинг попадают только участники команд — PM ведут команды,
            поэтому их XP не учитывается.
          </p>
          <div class="flex flex-col gap-1.5 mt-auto">
            <div class="flex gap-1.5">
              <button
                v-for="sc in scopes"
                :key="sc.key"
                @click="setScope(sc.key)"
                :class="[
                  'flex-1 p-2.5 rounded-lg border font-mono text-xs tracking-[0.08em] uppercase cursor-pointer transition-all duration-150',
                  scope === sc.key ? 'bg-mint-brand text-btn-ink border-mint-brand' : 'bg-bg-3 text-ink-3 border-line',
                ]"
              >
                {{ sc.label }}
              </button>
            </div>
            <div class="flex gap-1.5">
              <button
                v-for="s in sorts"
                :key="s.key"
                @click="activeSort = s.key"
                :class="[
                  'flex-1 p-2.5 rounded-lg border font-mono text-xs tracking-[0.08em] uppercase cursor-pointer transition-all duration-150',
                  activeSort === s.key ? 'bg-cyan-brand text-btn-ink border-cyan-brand' : 'bg-bg-3 text-ink-3 border-line',
                ]"
              >
                {{ s.label }}
              </button>
            </div>
          </div>
        </div>

        <div class="bg-bg-2 border border-line rounded-[22px] p-3 sm:p-5">
          <div v-if="scope === 'players'" class="hidden md:grid grid-cols-[56px_1fr_84px_104px_72px_90px] gap-[18px] items-center font-mono text-[10px] tracking-[0.14em] text-ink-3 uppercase py-2 px-[18px] pb-3.5 border-b border-line lb-row header">
            <span>Ранг</span>
            <span>Команда · Игрок</span>
            <span>Уровень</span>
            <span>Челленджей</span>
            <span>Стрик</span>
            <span class="text-right">XP всего</span>
          </div>
          <div v-else class="hidden md:grid grid-cols-[56px_1fr_104px_120px_90px] gap-[18px] items-center font-mono text-[10px] tracking-[0.14em] text-ink-3 uppercase py-2 px-[18px] pb-3.5 border-b border-line lb-row header">
            <span>Ранг</span>
            <span>Команда</span>
            <span>Участников</span>
            <span>Челленджей</span>
            <span class="text-right">XP всего</span>
          </div>

          <!-- empty state -->
          <div v-if="emptyState" class="py-16 text-center">
            <p class="font-mono text-[12px] text-ink-3 uppercase tracking-[0.14em] m-0">
              Пока в рейтинге пусто
            </p>
            <p class="text-sm text-ink-2 m-0 mt-3">
              {{ scope === 'teams'
                ? 'Собери команду из участников — и она появится в рейтинге.'
                : 'Зарегистрируй первого участника команды — и он окажется на первой строке.' }}
            </p>
          </div>

          <!-- team rows -->
          <template v-if="scope === 'teams'">
            <div
              v-for="team in teamRows"
              :key="team.name + '-' + team.rank"
              :class="[
                'lb-row relative grid grid-cols-[44px_1fr_auto] md:grid-cols-[56px_1fr_104px_120px_90px] gap-3 md:gap-[18px] items-center py-3 px-3 sm:py-3.5 sm:px-[18px] rounded-xl transition-colors duration-150 hover:bg-bg-3',
                team.rank === 1 ? 'top1' : '',
              ]"
            >
              <span :class="['font-pix text-[22px] sm:text-[28px] w-11 sm:w-14', rankColor(team.rank)]">
                {{ String(team.rank).padStart(2, '0') }}
              </span>
              <div class="flex gap-3.5 items-center min-w-0">
                <div
                  class="relative w-[38px] h-[38px] rounded-[10px] overflow-hidden font-pix text-lg flex items-center justify-center shrink-0 ring-1 ring-[rgba(255,255,255,0.12)] text-[#11131c]"
                  :style="{ background: team.gradient }"
                >
                  {{ team.initial }}
                </div>
                <div class="text-sm font-semibold truncate">{{ team.name }}</div>
              </div>
              <span class="hidden md:block font-mono text-[12px] text-ink-2">{{ team.members }} в команде</span>
              <span class="hidden md:block font-mono text-[12px] text-ink-2">{{ team.closedValue }} закрыто</span>
              <span :class="['font-pix text-[18px] sm:text-[22px] text-right', team.rank === 1 ? 'text-cyan-brand' : 'text-ink']">
                {{ team.xp }}
              </span>
            </div>
          </template>

          <!-- player rows -->
          <div
            v-for="row in rows"
            v-show="scope === 'players'"
            :key="(row.userId ?? row.name) + '-' + row.rank"
            :class="[
              'lb-row relative overflow-hidden grid grid-cols-[44px_1fr_auto] md:grid-cols-[56px_1fr_84px_104px_72px_90px] gap-3 md:gap-[18px] items-center py-3 px-3 sm:py-3.5 sm:px-[18px] rounded-xl transition-colors duration-150',
              hasBanner(row) ? 'has-banner' : 'hover:bg-bg-3',
              row.rank === 1 ? 'top1' : '',
              row.me && !hasBanner(row) ? 'bg-[rgba(24,239,242,0.06)] border border-[rgba(24,239,242,0.25)]' : '',
              row.me ? 'is-me' : '',
            ]"
            :style="rowStyle(row)"
          >
            <!-- profile-header banner art -->
            <img
              v-if="hasBanner(row) && row.headerImage"
              class="lb-art"
              :src="row.headerImage"
              alt=""
              aria-hidden="true"
              :style="rowArtStyle(row)"
            />

            <span :class="['font-pix text-[22px] sm:text-[28px] w-11 sm:w-14', rankColor(row.rank)]" :style="row.me && !hasBanner(row) ? { color: 'var(--color-cyan-brand)' } : ink(row)">
              {{ String(row.rank).padStart(2, '0') }}
            </span>
            <div class="flex gap-3.5 items-center min-w-0">
              <div
                class="relative w-[38px] h-[38px] rounded-[10px] overflow-hidden font-pix text-lg flex items-center justify-center shrink-0 ring-1 ring-[rgba(255,255,255,0.12)]"
                :style="tileStyle(row)"
              >
                <img
                  v-if="row.avatarUrl"
                  :src="row.avatarUrl"
                  alt=""
                  class="absolute inset-0 w-full h-full object-cover"
                />
                <span v-else class="text-[#11131c]">{{ row.initial }}</span>
              </div>
              <div class="min-w-0">
                <div class="text-sm font-semibold truncate" :style="ink(row)">{{ row.name }}<span v-if="row.me" class="ml-2 text-cyan-brand text-[11px] font-mono tracking-[0.08em] uppercase">это ты</span></div>
                <div class="font-mono text-[11px] text-ink-3 truncate" :style="ink(row, false)">{{ row.team }}</div>
              </div>
            </div>
            <span class="hidden md:block font-mono text-[12px] text-ink-2" :style="ink(row, false)">{{ row.level }}</span>
            <span class="hidden md:block font-mono text-[12px] text-ink-2" :style="ink(row, false)">{{ row.closed }}</span>
            <span
              class="hidden md:inline-flex font-mono text-[12px] items-center gap-1"
              :class="row.streak ? 'text-mint-brand' : 'text-ink-3'"
              :style="ink(row, false)"
            ><UIcon name="i-lucide-flame" class="w-3.5 h-3.5" /> {{ row.streak ?? 0 }}</span>
            <span :class="['font-pix text-[18px] sm:text-[22px] text-right', row.rank === 1 ? 'text-cyan-brand' : 'text-ink']" :style="ink(row)">
              {{ row.xp }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
/* profile-header banner art, painted behind the row content */
.lb-art {
  position: absolute;
  z-index: 0;
  object-fit: contain;
  transform: translate(-50%, -50%);
  opacity: 0.3;
  pointer-events: none;
  user-select: none;
  filter: drop-shadow(0 8px 14px rgba(0, 0, 0, 0.25));
}
/* keep cells above the art */
.lb-row.has-banner > *:not(.lb-art) { position: relative; z-index: 1; }
.lb-row.has-banner { border: 1px solid rgba(255, 255, 255, 0.12); }
.lb-row.has-banner.is-me { box-shadow: 0 0 0 2px rgba(24, 239, 242, 0.55); }
</style>
