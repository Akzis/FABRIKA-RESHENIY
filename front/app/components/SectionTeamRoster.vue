<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import type { UserProfile } from '~/types/user'

const { team, members, loading, fetch, rename, removeMember, activity, activityLoading, fetchActivity } = useTeam()
const strapiBase = (useRuntimeConfig().public as any)?.strapi?.url ?? 'http://localhost:1337'

onMounted(() => { void fetch() })

const avatarSrc = (url: string | null): string | null => {
  if (!url) return null
  return /^https?:\/\//.test(url) ? url : `${strapiBase}${url}`
}

const initial = (name: string) => (name?.[0] ?? '?').toUpperCase()
const fmt = (n: number) => n.toLocaleString('ru-RU').replace(/,/g, ' ')

// ── team rename (inline) ──
const editing = ref(false)
const draftName = ref('')
const saving = ref(false)
const error = ref<string | null>(null)

watch(team, (t) => { if (t && !editing.value) draftName.value = t.name }, { immediate: true })

const startEdit = () => {
  draftName.value = team.value?.name ?? ''
  error.value = null
  editing.value = true
}
const cancelEdit = () => { editing.value = false; error.value = null }
const saveName = async () => {
  if (saving.value) return
  saving.value = true
  error.value = null
  const err = await rename(draftName.value)
  saving.value = false
  if (err) { error.value = err; return }
  editing.value = false
}

// aggregate stats for the header
const totalXp = computed(() => members.value.reduce((s, m) => s + (m.xp || 0), 0))
const totalClosed = computed(() => members.value.reduce((s, m) => s + (m.challengesClosed || 0), 0))

// ── activity heatmap (collapsible) ──
// A GitHub-style per-day calendar of completions. Challenge days come from
// historic submissions (backfilled server-side) + new reviews; daily days
// accumulate from the moment activity logging was added. Loaded lazily when
// the panel is first opened.
const chartsOpen = ref(false)

const activityMembers = computed(() => activity.value?.members ?? [])

// Visible window. The endpoint always returns ~53 weeks; we trim the [from, to]
// we hand each heatmap, so the user can both pick the window length and slide it
// month-by-month across the year (◀ older / ▶ newer).
const RANGE_OPTIONS = [
  { months: 3, label: '3 мес' },
  { months: 6, label: '6 мес' },
  { months: 12, label: 'Год' },
]
const MONTH_NAMES = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
]
const rangeMonths = ref(3)
// How many months back from the latest data the window's end sits. 0 = newest.
const endOffsetMonths = ref(0)

const isoOf = (dt: Date) => dt.toISOString().slice(0, 10)
const addMonths = (iso: string, n: number): Date => {
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(Date.UTC(y!, (m! - 1), d!))
  dt.setUTCMonth(dt.getUTCMonth() + n)
  return dt
}

const winEnd = computed<string | null>(() => {
  const a = activity.value
  if (!a?.to) return null
  const e = isoOf(addMonths(a.to, -endOffsetMonths.value))
  return e > a.to ? a.to : e
})
const winStart = computed<string | null>(() => {
  const a = activity.value
  if (!a?.to || !winEnd.value) return a?.from ?? null
  const s = isoOf(addMonths(winEnd.value, -rangeMonths.value))
  return a.from && s < a.from ? a.from : s
})

const canNewer = computed(() => endOffsetMonths.value > 0)
const canOlder = computed(() => {
  const a = activity.value
  return !!(a?.from && winStart.value && winStart.value > a.from)
})
const goOlder = () => { if (canOlder.value) endOffsetMonths.value += 1 }
const goNewer = () => { if (canNewer.value) endOffsetMonths.value -= 1 }

const rangeLabel = computed(() => {
  if (!winStart.value || !winEnd.value) return ''
  const [sy, sm] = winStart.value.split('-').map(Number)
  const [ey, em] = winEnd.value.split('-').map(Number)
  const start = sy === ey ? MONTH_NAMES[sm! - 1] : `${MONTH_NAMES[sm! - 1]} ${sy}`
  const end = `${MONTH_NAMES[em! - 1]} ${ey}`
  return start === end ? end : `${start} – ${end}`
})

const toggleCharts = () => {
  chartsOpen.value = !chartsOpen.value
  if (chartsOpen.value && !activity.value) void fetchActivity()
}

// ── remove member (inline confirm) ──
const confirmId = ref<number | null>(null)
const removingId = ref<number | null>(null)
const removeError = ref<string | null>(null)
const selectedMember = ref<UserProfile | null>(null)
const memberProfileOpen = ref(false)
const memberOriginRect = ref<DOMRect | null>(null)

const askRemove = (id: number) => { confirmId.value = id; removeError.value = null }
const cancelRemove = () => { confirmId.value = null }
const doRemove = async (id: number) => {
  if (removingId.value) return
  removingId.value = id
  removeError.value = null
  const err = await removeMember(id)
  removingId.value = null
  if (err) { removeError.value = err; return }
  confirmId.value = null
}

const memberToProfile = (m: typeof members.value[number]): UserProfile => ({
  id: m.id,
  username: m.username,
  email: '',
  displayName: m.name,
  team: team.value?.name ?? '',
  teamRole: 'member',
  xp: m.xp,
  level: m.level,
  xpToNextLevel: 100,
  streak: m.streak,
  challengesClosed: m.challengesClosed,
  badgesCount: m.badgesCount,
  teamCupPlace: 0,
  teamCupCurrent: 0,
  teamCupTotal: 10000,
  earnedBadges: [],
  avatar: m.avatarUrl ? { url: m.avatarUrl } : null,
})

const openMemberProfile = (m: typeof members.value[number], e: MouseEvent | KeyboardEvent) => {
  selectedMember.value = memberToProfile(m)
  const target = e.currentTarget as HTMLElement | null
  memberOriginRect.value = target?.getBoundingClientRect?.() ?? null
  memberProfileOpen.value = true
}

const closeMemberProfile = () => {
  memberProfileOpen.value = false
  selectedMember.value = null
  memberOriginRect.value = null
}

</script>

<template>
  <section id="team" class="py-16 sm:py-[90px] relative scroll-mt-24">
    <div class="max-w-[1100px] mx-auto px-4 sm:px-8">
      <SectionHeader tag="Команда" tag-color="var(--color-mint-brand)" sub="Все участники твоей команды и их статистика: опыт, уровень, закрытые челленджи и серия. Здесь же можно переименовать команду.">
        <template #title>
          Моя <span class="text-mint-brand">команда</span>
        </template>
      </SectionHeader>

      <!-- team header card: name + rename + totals -->
      <div class="bg-bg-2 border border-line rounded-[18px] p-6 mb-6 flex flex-wrap items-center gap-5">
        <div class="flex-1 min-w-[220px]">
          <div class="font-mono text-[10px] tracking-[0.14em] uppercase text-ink-3 mb-2">Название команды</div>

          <div v-if="!editing" class="flex items-center gap-3 flex-wrap">
            <span class="font-pix text-[28px] leading-none text-ink uppercase">{{ team?.name ?? '—' }}</span>
            <button type="button" class="tr-edit font-mono" @click="startEdit">✎ Переименовать</button>
          </div>

          <div v-else class="flex items-center gap-2 flex-wrap">
            <input
              v-model="draftName"
              type="text"
              maxlength="60"
              class="py-2.5 px-3.5 bg-bg border border-line-strong rounded-[10px] text-ink text-[16px] outline-none focus:border-mint-brand min-w-[220px]"
              @keyup.enter="saveName"
              @keyup.esc="cancelEdit"
            />
            <button type="button" class="tr-save font-mono" :disabled="saving" @click="saveName">
              {{ saving ? 'Сохраняем…' : 'Сохранить' }}
            </button>
            <button type="button" class="tr-cancel font-mono" :disabled="saving" @click="cancelEdit">Отмена</button>
          </div>

          <p v-if="error" class="font-mono text-[12px] text-[#ff7575] mt-2">{{ error }}</p>
        </div>

        <div class="flex gap-6">
          <div class="text-center">
            <div class="font-pix text-[24px] text-cyan-brand leading-none">{{ members.length }}</div>
            <div class="font-mono text-[9px] tracking-[0.1em] uppercase text-ink-3 mt-1.5">участников</div>
          </div>
          <div class="text-center">
            <div class="font-pix text-[24px] text-mint-brand leading-none">{{ fmt(totalXp) }}</div>
            <div class="font-mono text-[9px] tracking-[0.1em] uppercase text-ink-3 mt-1.5">XP команды</div>
          </div>
          <div class="text-center">
            <div class="font-pix text-[24px] text-purple-brand leading-none">{{ fmt(totalClosed) }}</div>
            <div class="font-mono text-[9px] tracking-[0.1em] uppercase text-ink-3 mt-1.5">челленджей</div>
          </div>
        </div>
      </div>

      <!-- activity charts (collapsible) -->
      <div v-if="members.length" class="bg-bg-2 border border-line rounded-[18px] mb-6 overflow-hidden">
        <button
          type="button"
          class="tc-toggle font-mono"
          :aria-expanded="chartsOpen"
          @click="toggleCharts"
        >
          <span class="flex items-center gap-2.5 before:content-[''] before:w-2 before:h-2 before:bg-cyan-brand">
            Активность по дням
          </span>
          <svg
            class="tc-chevron"
            :class="{ 'is-open': chartsOpen }"
            viewBox="0 0 24 24" width="16" height="16"
            fill="none" stroke="currentColor" stroke-width="2"
            stroke-linecap="round" stroke-linejoin="round"
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>

        <Transition name="tc-collapse">
          <div v-if="chartsOpen" class="tc-body">
            <div class="tc-inner">
              <p v-if="activityLoading && !activityMembers.length" class="tc-msg font-mono">
                Загружаем активность…
              </p>
              <p v-else-if="!activityMembers.length" class="tc-msg font-mono">
                Пока нет данных об активности.
              </p>
              <template v-else>
                <!-- controls: window length + month navigation -->
                <div class="tc-range">
                  <div class="tc-range-len">
                    <button
                      v-for="opt in RANGE_OPTIONS"
                      :key="opt.months"
                      type="button"
                      class="tc-range-btn font-mono"
                      :class="{ 'is-active': rangeMonths === opt.months }"
                      @click="rangeMonths = opt.months"
                    >{{ opt.label }}</button>
                  </div>
                  <div class="tc-range-nav">
                    <button
                      type="button"
                      class="tc-nav-btn"
                      :disabled="!canOlder"
                      aria-label="Раньше"
                      @click="goOlder"
                    >‹</button>
                    <span class="tc-range-label font-mono">{{ rangeLabel }}</span>
                    <button
                      type="button"
                      class="tc-nav-btn"
                      :disabled="!canNewer"
                      aria-label="Позже"
                      @click="goNewer"
                    >›</button>
                  </div>
                </div>

                <div class="flex flex-col gap-7">
                  <div v-for="m in activityMembers" :key="m.id" class="tc-hm-block">
                    <div class="tc-hm-head">
                      <span class="tc-hm-name">{{ m.name }}</span>
                      <span class="tc-hm-totals font-mono">
                        челленджи <b class="text-ink">{{ m.totalChallenges }}</b>
                        · ежедневки <b class="text-ink">{{ m.totalDailies }}</b>
                      </span>
                    </div>
                    <ActivityHeatmap :from="winStart" :to="winEnd" :days="m.days" />
                  </div>
                </div>
              </template>
            </div>
          </div>
        </Transition>
      </div>

      <!-- members list -->
      <div class="bg-bg-2 border border-line rounded-[18px] p-6">
        <div class="flex items-center justify-between mb-4">
          <h4 class="font-mono text-[11px] tracking-[0.14em] text-ink-3 uppercase m-0 flex items-center gap-2.5 before:content-[''] before:w-2 before:h-2 before:bg-mint-brand">
            Участники
          </h4>
          <button type="button" class="font-mono text-[10px] tracking-[0.1em] uppercase text-ink-3 hover:text-ink-2" :disabled="loading" @click="fetch()">
            {{ loading ? 'Обновляем…' : 'Обновить' }}
          </button>
        </div>

        <p v-if="!members.length" class="text-sm text-ink-3 py-10 text-center">
          В команде пока нет участников. Пригласи их ссылкой из профиля.
        </p>

        <!-- column header -->
        <div v-else class="hidden sm:grid grid-cols-[1.6fr_repeat(4,0.8fr)] gap-3 px-3 pb-2 font-mono text-[9px] tracking-[0.1em] uppercase text-ink-3 border-b border-line">
          <span>Участник</span>
          <span class="text-right">Уровень</span>
          <span class="text-right">XP</span>
          <span class="text-right">Челленджи</span>
          <span class="text-right">Серия</span>
        </div>

        <div class="flex flex-col gap-1.5 mt-2">
          <div
            v-for="(m, i) in members"
            :key="m.id"
            class="group relative grid grid-cols-2 sm:grid-cols-[1.6fr_repeat(4,0.8fr)] gap-3 items-center px-3 py-3 pr-10 rounded-xl bg-bg-3 border border-line hover:border-line-strong transition-colors"
            role="button"
            tabindex="0"
            :aria-label="`Открыть профиль ${m.name}`"
            @click="openMemberProfile(m, $event)"
            @keydown.enter.prevent="openMemberProfile(m, $event)"
            @keydown.space.prevent="openMemberProfile(m, $event)"
          >
            <!-- remove member (PM) -->
            <div class="absolute top-2 right-2 z-10">
              <button
                v-if="confirmId !== m.id"
                type="button"
                class="tr-remove font-mono opacity-0 group-hover:opacity-100 focus:opacity-100"
                title="Удалить из команды"
                aria-label="Удалить из команды"
                @click.stop="askRemove(m.id)"
              >✕</button>
              <div v-else class="flex items-center gap-1.5">
                <span class="font-mono text-[10px] uppercase text-ink-3 hidden sm:inline">Удалить?</span>
                <button type="button" class="tr-remove-yes font-mono" :disabled="removingId === m.id" @click.stop="doRemove(m.id)">
                  {{ removingId === m.id ? '…' : 'Да' }}
                </button>
                <button type="button" class="tr-remove-no font-mono" :disabled="removingId === m.id" @click.stop="cancelRemove">Нет</button>
              </div>
            </div>

            <div class="flex items-center gap-3 min-w-0 col-span-2 sm:col-span-1">
              <div class="w-9 h-9 rounded-[10px] overflow-hidden flex items-center justify-center font-pix text-sm shrink-0" :class="avatarSrc(m.avatarUrl) ? 'text-white' : 'bg-white text-[#11131c]'" :style="avatarSrc(m.avatarUrl) ? 'background: linear-gradient(135deg, var(--color-purple-brand), var(--color-cyan-brand))' : undefined">
                <img v-if="avatarSrc(m.avatarUrl)" :src="avatarSrc(m.avatarUrl)!" alt="" class="w-full h-full object-cover" />
                <template v-else>{{ initial(m.name) }}</template>
              </div>
              <div class="min-w-0">
                <div class="text-sm font-semibold text-ink truncate">{{ m.name }}</div>
                <div class="font-mono text-[11px] text-ink-3 truncate">@{{ m.username }}</div>
              </div>
            </div>
            <div class="text-right"><span class="sm:hidden font-mono text-[9px] uppercase text-ink-3 mr-1.5">LVL</span><span class="font-pix text-[16px] text-ink">{{ m.level }}</span></div>
            <div class="text-right"><span class="sm:hidden font-mono text-[9px] uppercase text-ink-3 mr-1.5">XP</span><span class="font-pix text-[16px] text-cyan-brand">{{ fmt(m.xp) }}</span></div>
            <div class="text-right"><span class="sm:hidden font-mono text-[9px] uppercase text-ink-3 mr-1.5">Зад.</span><span class="font-pix text-[16px] text-mint-brand">{{ m.challengesClosed }}</span></div>
            <div class="text-right"><span class="sm:hidden font-mono text-[9px] uppercase text-ink-3 mr-1.5">Серия</span><span class="font-pix text-[16px] text-purple-brand">{{ m.streak }}</span></div>
          </div>
        </div>

        <p v-if="removeError" class="font-mono text-[12px] text-[#ff7575] mt-3">{{ removeError }}</p>
      </div>
    </div>
    <ProfileModal :open="memberProfileOpen" :profile="selectedMember" :origin-rect="memberOriginRect" @close="closeMemberProfile" />
  </section>
</template>

<style scoped>
/* ── activity charts ── */
.tc-toggle {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 18px 24px;
  background: transparent;
  border: 0;
  cursor: pointer;
  color: var(--color-ink-3);
  font-size: 11px;
  letter-spacing: .14em;
  text-transform: uppercase;
  transition: color 150ms;
}
.tc-toggle:hover { color: var(--color-ink); }
.tc-chevron { flex-shrink: 0; transition: transform 220ms ease; }
.tc-chevron.is-open { transform: rotate(180deg); }

.tc-inner {
  padding: 0 24px 24px;
}
.tc-msg {
  font-size: 12px;
  color: var(--color-ink-3);
  padding: 8px 0 4px;
}
.tc-range {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 18px;
}
.tc-range-len { display: flex; gap: 6px; }
.tc-range-nav {
  display: flex;
  align-items: center;
  gap: 8px;
}
.tc-range-label {
  min-width: 150px;
  text-align: center;
  font-size: 11px;
  letter-spacing: .04em;
  color: var(--color-ink-2);
}
.tc-nav-btn {
  width: 28px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  border: 1px solid var(--color-line);
  background: transparent;
  color: var(--color-ink-2);
  font-size: 18px;
  line-height: 1;
  cursor: pointer;
  transition: color 150ms, border-color 150ms, background 150ms, opacity 150ms;
}
.tc-nav-btn:hover:not(:disabled) {
  color: var(--color-cyan-brand);
  border-color: var(--color-cyan-brand);
  background: rgba(24, 239, 242, 0.08);
}
.tc-nav-btn:disabled { opacity: .35; cursor: default; }
.tc-range-btn {
  padding: 6px 12px;
  border-radius: 8px;
  border: 1px solid var(--color-line);
  background: transparent;
  color: var(--color-ink-3);
  font-size: 10px;
  letter-spacing: .08em;
  text-transform: uppercase;
  cursor: pointer;
  transition: color 150ms, border-color 150ms, background 150ms;
}
.tc-range-btn:hover { color: var(--color-ink); border-color: var(--color-line-strong); }
.tc-range-btn.is-active {
  color: var(--color-cyan-brand);
  border-color: var(--color-cyan-brand);
  background: rgba(24, 239, 242, 0.08);
}
.tc-hm-block {
  border-top: 1px solid var(--color-line);
  padding-top: 16px;
}
.tc-hm-block:first-child {
  border-top: 0;
  padding-top: 0;
}
.tc-hm-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}
.tc-hm-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-ink);
}
.tc-hm-totals {
  font-size: 11px;
  letter-spacing: .04em;
  color: var(--color-ink-3);
}
@media (prefers-reduced-motion: reduce) {
  .tc-chevron { transition: none; }
}

/* collapse transition: animate the wrapper's row track 0fr → 1fr */
.tc-body {
  display: grid;
  grid-template-rows: 1fr;
}
.tc-body > .tc-inner { min-height: 0; }
.tc-collapse-enter-active,
.tc-collapse-leave-active {
  transition: grid-template-rows 320ms ease, opacity 320ms ease;
}
.tc-collapse-enter-active > .tc-inner,
.tc-collapse-leave-active > .tc-inner { overflow: hidden; }
.tc-collapse-enter-from,
.tc-collapse-leave-to {
  grid-template-rows: 0fr;
  opacity: 0;
}

.tr-edit {
  padding: 7px 12px;
  border-radius: 9px;
  border: 1px solid var(--color-line-strong);
  background: transparent;
  color: var(--color-ink-2);
  font-size: 10px;
  letter-spacing: .08em;
  text-transform: uppercase;
  cursor: pointer;
  transition: color 150ms, border-color 150ms;
}
.tr-edit:hover { color: var(--color-mint-brand); border-color: var(--color-mint-brand); }

.tr-save {
  padding: 9px 16px;
  border-radius: 10px;
  border: 0;
  background: var(--color-mint-brand);
  color: var(--color-btn-ink);
  font-size: 11px;
  letter-spacing: .06em;
  text-transform: uppercase;
  cursor: pointer;
  transition: opacity 150ms;
}
.tr-save:disabled { opacity: .5; cursor: progress; }

.tr-cancel {
  padding: 9px 14px;
  border-radius: 10px;
  border: 1px solid var(--color-line-strong);
  background: transparent;
  color: var(--color-ink-2);
  font-size: 11px;
  letter-spacing: .06em;
  text-transform: uppercase;
  cursor: pointer;
}
.tr-cancel:hover:not(:disabled) { color: var(--color-ink); }

.tr-remove {
  width: 24px;
  height: 24px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  border: 1px solid var(--color-line-strong);
  background: var(--color-bg-2);
  color: var(--color-ink-3);
  font-size: 11px;
  line-height: 1;
  cursor: pointer;
  transition: color 150ms, border-color 150ms, opacity 150ms;
}
.tr-remove:hover { color: #ff7575; border-color: #ff7575; }

.tr-remove-yes {
  padding: 5px 10px;
  border-radius: 8px;
  border: 0;
  background: #ff7575;
  color: #fff;
  font-size: 10px;
  letter-spacing: .06em;
  text-transform: uppercase;
  cursor: pointer;
  transition: opacity 150ms;
}
.tr-remove-yes:disabled { opacity: .5; cursor: progress; }

.tr-remove-no {
  padding: 5px 10px;
  border-radius: 8px;
  border: 1px solid var(--color-line-strong);
  background: var(--color-bg-2);
  color: var(--color-ink-2);
  font-size: 10px;
  letter-spacing: .06em;
  text-transform: uppercase;
  cursor: pointer;
}
.tr-remove-no:hover:not(:disabled) { color: var(--color-ink); }
</style>
