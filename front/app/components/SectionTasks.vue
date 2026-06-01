<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import type { UserProfile } from '~/types/user'
import type { ChallengeTask, ChallengeTaskLevel, DailyQuest, SubmissionStatus } from '~/types/landing'

const { challenges, daily } = useLandingData()
const user = useStrapiUser<UserProfile>()
const {
  completedChallengeIds,
  completedDailyIds,
  completeDaily,
} = useTasks()

// Challenge submissions: clicking a challenge opens a submit modal; the card
// then reflects the review state (pending / approved / partial / rejected).
const { byChallenge, fetch: fetchSubmissions } = useSubmissions()
onMounted(() => { void fetchSubmissions() })

const submitOpen = ref(false)
const selectedChallenge = ref<ChallengeTask | null>(null)

// Combined per-challenge state. Both "partial" and "approved" grades credit
// completedChallenges server-side, so the completed-ids flag stays true even
// after a resubmit. The *latest* submission status must therefore win over that
// flag — otherwise resubmitting a partial/rejected challenge (which creates a
// new `pending` submission) would still read as "done". The completed-ids
// shortcut is only the fallback for challenges with no submission on record.
type CState = 'open' | 'pending' | 'rejected' | 'partial' | 'done'
const challengeState = (c: ChallengeTask): CState => {
  const sub = c.id != null ? byChallenge.value.get(c.id) : undefined
  const st = sub?.status as SubmissionStatus | undefined
  if (st === 'pending') return 'pending'
  if (st === 'rejected') return 'rejected'
  if (st === 'partial') return 'partial'
  if (st === 'approved') return 'done'
  if (isChallengeDone(c)) return 'done'
  return 'open'
}

// Manager's review note for a challenge (shown on partial/rejected cards).
const reviewNoteOf = (c: ChallengeTask): string => {
  const sub = c.id != null ? byChallenge.value.get(c.id) : undefined
  return sub?.reviewNote?.trim() ?? ''
}
const isClickable = (c: ChallengeTask) => {
  const s = challengeState(c)
  // partial is resubmittable — the PM review tops up XP to the new grade
  return s === 'open' || s === 'rejected' || s === 'partial'
}

const streak = computed(() => user.value?.streak ?? 0)

// ── level badges / filter ──────────────────────────────────────────────
const levelMeta: Record<ChallengeTaskLevel, { label: string; badge: string; dot: string }> = {
  light:  { label: 'LIGHT',  badge: 'text-mint-brand border-[rgba(82,242,197,0.4)] bg-[rgba(82,242,197,0.08)]',  dot: 'bg-mint-brand' },
  medium: { label: 'MEDIUM', badge: 'text-cyan-brand border-[rgba(24,239,242,0.4)] bg-[rgba(24,239,242,0.08)]',  dot: 'bg-cyan-brand' },
  hard:   { label: 'HARD',   badge: 'text-purple-brand border-[rgba(181,89,243,0.4)] bg-[rgba(181,89,243,0.08)]', dot: 'bg-purple-brand' },
}

const visibleChallenges = computed<ChallengeTask[]>(() => challenges.value)

const isChallengeDone = (c: ChallengeTask) => c.id != null && completedChallengeIds.value.has(c.id)
const isDailyDone = (q: { id?: number }) => q.id != null && completedDailyIds.value.has(q.id)

// in-flight task ids (block double taps while the request runs)
const busy = ref<Set<string>>(new Set())
const isBusy = (key: string) => busy.value.has(key)
const runComplete = async <T,>(key: string, fn: () => Promise<T>): Promise<T | undefined> => {
  if (busy.value.has(key)) return undefined
  busy.value = new Set(busy.value).add(key)
  try { return await fn() } finally {
    const next = new Set(busy.value); next.delete(key); busy.value = next
  }
}

// ── celebration animation on completion (GSAP) ─────────────────────────
let gsapRef: any = null
const loadGsap = async () => {
  if (gsapRef) return gsapRef
  const mod = await import('gsap')
  gsapRef = (mod as any).gsap ?? mod.default
  return gsapRef
}
const reduced = () =>
  import.meta.client && window.matchMedia('(prefers-reduced-motion: reduce)').matches

const celebrate = async (el: HTMLElement | null, text: string) => {
  if (!el || reduced()) return
  const gsap = await loadGsap()
  // springy pop + mint glow ring
  gsap.fromTo(el, { scale: 0.97 }, { scale: 1, duration: 0.6, ease: 'elastic.out(1, 0.5)', clearProps: 'scale' })
  gsap.fromTo(el,
    { boxShadow: '0 0 0 0 rgba(82,242,197,0.55)' },
    { boxShadow: '0 0 0 12px rgba(82,242,197,0)', duration: 0.85, ease: 'power2.out', clearProps: 'boxShadow' },
  )
  // floating "+XP" rising off the card (on body to escape overflow:hidden)
  const rect = el.getBoundingClientRect()
  const float = document.createElement('div')
  float.textContent = text
  Object.assign(float.style, {
    position: 'fixed',
    left: `${rect.right - 84}px`,
    top: `${rect.top + 10}px`,
    zIndex: '70',
    pointerEvents: 'none',
    font: '700 24px "Pixelify Sans", system-ui, sans-serif',
    color: 'var(--color-mint-brand)',
    textShadow: '0 2px 14px rgba(82,242,197,0.55)',
    whiteSpace: 'nowrap',
  })
  document.body.appendChild(float)
  gsap.fromTo(float,
    { y: 0, opacity: 1, scale: 0.85 },
    { y: -52, opacity: 0, scale: 1.15, duration: 1.0, ease: 'power2.out', onComplete: () => float.remove() },
  )
}

// ── click-to-submit (challenges now go through PM review) ───────────────
const onChallengeClick = (_e: MouseEvent, c: ChallengeTask) => {
  if (!c.id || !isClickable(c)) return
  selectedChallenge.value = c
  submitOpen.value = true
}
const onSubmitted = async () => {
  // refresh so the card flips to "На проверке" immediately
  await fetchSubmissions()
}

// Tapping a daily row. An `action` quest completes on the spot (honor-based);
// a `quiz` quest instead opens its multiple-choice panel — answering is what
// completes it (see onQuizAnswer).
const onDailyClick = async (e: MouseEvent, q: DailyQuest, i: number) => {
  if (!q.id) return
  if (q.kind === 'quiz') { toggleDaily(i, true); return }
  if (completedDailyIds.value.has(q.id) || isBusy('d' + q.id)) return
  const card = (e.currentTarget as HTMLElement).closest('.dash-quest') as HTMLElement
  const res = await runComplete('d' + q.id, () => completeDaily(q.id))
  if (res?.ok) await celebrate(card, `+${q.points} XP`)
}

// The option a user got wrong, per quest id — drives the red "не то" highlight
// until they pick again. Cleared on a correct answer.
const quizWrong = ref<Record<number, number | null>>({})
const wrongOption = (id?: number) => (id != null ? quizWrong.value[id] ?? null : null)

const onQuizAnswer = async (e: MouseEvent, q: DailyQuest, optIdx: number) => {
  if (!q.id || completedDailyIds.value.has(q.id) || isBusy('d' + q.id)) return
  const card = (e.currentTarget as HTMLElement).closest('.dash-quest') as HTMLElement
  const res = await runComplete('d' + q.id, () => completeDaily(q.id, optIdx))
  if (res?.ok) {
    quizWrong.value = { ...quizWrong.value, [q.id]: null }
    await celebrate(card, `+${q.points} XP`)
  } else if (res?.wrongAnswer) {
    quizWrong.value = { ...quizWrong.value, [q.id]: optIdx }
  }
}

// ── week strip (from streak) ───────────────────────────────────────────
const weekDays = computed(() => {
  const labels = ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс']
  const today = ((new Date().getDay() + 6) % 7)
  const doneCount = Math.min(streak.value, today)
  return labels.map((d, i) => {
    if (i === today) return { d, state: 'today' as const }
    if (i < today && (today - i) <= doneCount) return { d, state: 'done' as const }
    return { d, state: 'none' as const }
  })
})

// ── expandable daily descriptions (GSAP accordion) ─────────────────────
const openDaily = ref<number | null>(null)
const toggleDaily = (i: number, hasText: boolean) => {
  if (!hasText) return
  openDaily.value = openDaily.value === i ? null : i
}

const onDailyEnter = async (el: Element, done: () => void) => {
  const node = el as HTMLElement
  if (reduced()) { node.style.height = 'auto'; done(); return }
  const gsap = await loadGsap()
  const full = node.scrollHeight
  gsap.fromTo(node, { height: 0, opacity: 0 }, {
    height: full, opacity: 1, duration: 0.42, ease: 'power3.out',
    onComplete: () => { node.style.height = 'auto'; done() },
  })
}
const onDailyLeave = async (el: Element, done: () => void) => {
  const node = el as HTMLElement
  if (reduced()) { done(); return }
  const gsap = await loadGsap()
  gsap.to(node, { height: 0, opacity: 0, duration: 0.3, ease: 'power2.in', onComplete: done })
}

// Reveal each panel as a whole. We intentionally don't scroll-reveal the
// individual cards/quests: they live *inside* these panels, and animating a
// transformed ancestor breaks the nested ScrollTriggers (cards got stuck at
// opacity 0). Per-item delight comes from CSS hover + the completion burst.
useReveal('.tasks-reveal', { stagger: 0.16, y: 50, scale: 0.97, blur: 4, duration: 1.0 })
</script>

<template>
  <section id="tasks" class="py-16 sm:py-[110px] relative scroll-mt-24">
    <div class="max-w-[1320px] mx-auto px-4 sm:px-8">
      <SectionHeader tag="Задания" tag-color="var(--color-cyan-brand)" sub="Бери челленджи по силам — LIGHT, MEDIUM или HARD — и закрывай ежедневные задания. За каждое выполненное задание начисляется XP и растёт твоё место в рейтинге.">
        <template #title>
          Выполняй <span class="text-cyan-brand">задания</span><br />— качай XP
        </template>
      </SectionHeader>

      <div class="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-6 items-start">
        <!-- ── challenges ── -->
        <div class="tasks-reveal bg-bg-2 border border-line rounded-[22px] p-5 sm:p-8">
          <div class="flex items-center justify-between flex-wrap gap-3 mb-6">
            <h4 class="font-mono text-[11px] tracking-[0.14em] text-ink-3 uppercase m-0 flex items-center gap-2.5 before:content-[''] before:w-2 before:h-2 before:bg-cyan-brand">
              Челленджи
            </h4>
          </div>

          <div class="flex flex-col gap-3">
            <div
              v-for="(c, i) in visibleChallenges"
              :key="c.id ?? i"
              role="button"
              :aria-disabled="!isClickable(c)"
              @click="onChallengeClick($event, c)"
              :class="[
                'task-card relative overflow-hidden border rounded-xl bg-bg-3 p-4 transition-[border-color,transform,opacity] duration-200 select-none',
                challengeState(c) === 'done'
                  ? 'border-mint-brand/40 opacity-70 cursor-default'
                  : challengeState(c) === 'partial'
                    ? 'border-cyan-brand/40 hover:border-cyan-brand hover:-translate-y-0.5 cursor-pointer active:scale-[0.99]'
                    : challengeState(c) === 'pending'
                      ? 'border-cyan-brand/40 opacity-80 cursor-default'
                      : challengeState(c) === 'rejected'
                        ? 'border-[rgba(255,117,117,0.4)] hover:border-[#ff7575] hover:-translate-y-0.5 cursor-pointer active:scale-[0.99]'
                        : 'border-line hover:border-cyan-brand hover:-translate-y-0.5 cursor-pointer active:scale-[0.99]',
              ]"
            >
              <div class="flex items-start gap-3.5">
                <span :class="['shrink-0 inline-flex items-center gap-1.5 font-mono text-[10px] tracking-[0.1em] uppercase px-2.5 py-1 rounded-full border', levelMeta[c.level].badge]">
                  {{ levelMeta[c.level].label }}
                </span>
                <div class="flex-1 min-w-0">
                  <div :class="['text-sm font-semibold', challengeState(c) === 'done' ? 'text-ink-3 line-through' : 'text-ink']">{{ c.title }}</div>
                  <p v-if="c.description" class="m-0 mt-1 text-[13px] leading-relaxed text-ink-3">{{ c.description }}</p>
                </div>
                <div class="shrink-0 text-right">
                  <div class="font-pix text-[18px] text-cyan-brand whitespace-nowrap">+{{ c.xp }} XP</div>
                  <div
                    :class="[
                      'mt-2 font-mono text-[10px] tracking-[0.1em] uppercase inline-flex items-center gap-1.5 justify-end',
                      challengeState(c) === 'done' ? 'text-mint-brand'
                        : challengeState(c) === 'partial' ? 'text-cyan-brand'
                        : challengeState(c) === 'pending' ? 'text-cyan-brand'
                        : challengeState(c) === 'rejected' ? 'text-[#ff7575]'
                        : 'text-ink-3',
                    ]"
                  >
                    <template v-if="challengeState(c) === 'done'">Выполнено</template>
                    <template v-else-if="challengeState(c) === 'partial'">Частично | сдать снова</template>
                    <template v-else-if="challengeState(c) === 'pending'">На проверке</template>
                    <template v-else-if="challengeState(c) === 'rejected'">Отклонено | сдать снова</template>
                    <template v-else>Выполнить <span class="text-cyan-brand">→</span></template>
                  </div>
                </div>
              </div>

              <!-- manager's note on a partial / rejected grade -->
              <div
                v-if="(challengeState(c) === 'partial' || challengeState(c) === 'rejected') && reviewNoteOf(c)"
                :class="[
                  'mt-3 pt-3 border-t text-[12px] leading-relaxed',
                  challengeState(c) === 'partial' ? 'border-cyan-brand/25' : 'border-[rgba(255,117,117,0.25)]',
                ]"
              >
                <span
                  :class="[
                    'font-mono text-[9px] tracking-[0.14em] uppercase mr-1.5',
                    challengeState(c) === 'partial' ? 'text-cyan-brand' : 'text-[#ff7575]',
                  ]"
                >Комментарий менеджера:</span>
                <span class="text-ink-2 whitespace-pre-line">{{ reviewNoteOf(c) }}</span>
              </div>
            </div>

            <p v-if="!visibleChallenges.length" class="text-sm text-ink-3 py-6 text-center">
              Челленджей пока нет.
            </p>
          </div>
        </div>

        <!-- ── daily quests ── -->
        <div class="tasks-reveal bg-bg-2 border border-line rounded-[22px] p-5 sm:p-8">
          <h4 class="font-mono text-[11px] tracking-[0.14em] text-ink-3 uppercase m-0 mb-[22px] flex items-center gap-2.5 before:content-[''] before:w-2 before:h-2 before:bg-mint-brand">
            Ежедневные задания
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
              :key="q.id ?? i"
              class="dash-quest border border-line rounded-xl bg-bg-3 overflow-hidden transition-colors duration-150"
              :class="openDaily === i ? 'border-line-strong' : ''"
            >
              <!-- action: click the row to complete · quiz: click to open the
                   answers · chevron (stop) reads the description -->
              <div
                role="button"
                :aria-disabled="isDailyDone(q) && q.kind !== 'quiz'"
                @click="onDailyClick($event, q, i)"
                :class="[
                  'flex gap-3.5 items-center py-3.5 px-4 select-none transition-colors',
                  isDailyDone(q) && q.kind !== 'quiz' ? 'cursor-default' : 'cursor-pointer hover:bg-bg-2/40',
                ]"
              >
                <span
                  :class="[
                    'w-[22px] h-[22px] rounded-md border-[1.5px] flex items-center justify-center shrink-0 transition-colors',
                    isDailyDone(q) ? 'bg-mint-brand border-mint-brand text-btn-ink font-bold' : 'border-line-strong',
                  ]"
                >
                  <span v-if="isDailyDone(q)">✓</span>
                </span>

                <span :class="['text-sm flex-1 min-w-0', isDailyDone(q) ? 'text-ink-3 line-through' : '', q.kind === 'quiz' ? '' : 'truncate']">
                  <span
                    v-if="q.kind === 'quiz'"
                    class="inline-flex items-center mr-1.5 align-middle font-mono text-[9px] tracking-[0.1em] uppercase px-1.5 py-0.5 rounded border border-cyan-brand/40 text-cyan-brand bg-[rgba(24,239,242,0.08)]"
                  >Квиз</span>{{ q.title }}
                </span>

                <button
                  v-if="q.kind === 'quiz' || q.description"
                  type="button"
                  aria-label="Подробнее"
                  :aria-expanded="openDaily === i"
                  @click.stop="toggleDaily(i, true)"
                  class="shrink-0 p-1 -m-1 text-ink-3 hover:text-ink-2"
                >
                  <svg
                    viewBox="0 0 24 24" width="15" height="15" fill="none"
                    stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
                    class="transition-transform duration-300"
                    :class="openDaily === i ? 'rotate-180' : ''"
                  >
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </button>

                <div :class="['font-pix text-[18px] shrink-0', isDailyDone(q) ? 'text-ink-3' : 'text-mint-brand']">+{{ q.points }}</div>
              </div>

              <!-- quiz: multiple-choice answers (validated server-side) -->
              <Transition :css="false" @enter="onDailyEnter" @leave="onDailyLeave">
                <div v-if="q.kind === 'quiz' && openDaily === i" class="overflow-hidden">
                  <div class="px-4 pb-4 pt-0 border-t border-line">
                    <!-- answered correctly → reveal the explanation -->
                    <div v-if="isDailyDone(q)" class="pt-3">
                      <span class="font-mono text-[10px] tracking-[0.1em] uppercase text-mint-brand">✓ Верно</span>
                      <p v-if="q.description" class="m-0 mt-1.5 text-[13px] leading-relaxed text-ink-2">{{ q.description }}</p>
                    </div>
                    <!-- still open → pick an answer -->
                    <div v-else class="pt-3 flex flex-col gap-2">
                      <button
                        v-for="(opt, oi) in q.options"
                        :key="oi"
                        type="button"
                        :disabled="isBusy('d' + q.id)"
                        @click.stop="onQuizAnswer($event, q, oi)"
                        :class="[
                          'text-left text-[13px] leading-snug px-3 py-2.5 rounded-lg border transition-colors disabled:opacity-60',
                          wrongOption(q.id) === oi
                            ? 'border-[rgba(255,117,117,0.5)] bg-[rgba(255,117,117,0.08)] text-[#ff7575]'
                            : 'border-line hover:border-cyan-brand hover:bg-bg-2/40 text-ink-2',
                        ]"
                      >{{ opt }}</button>
                      <p v-if="wrongOption(q.id) != null" class="m-0 mt-0.5 font-mono text-[11px] text-[#ff7575]">
                        Неверно — попробуй ещё раз.
                      </p>
                    </div>
                  </div>
                </div>
              </Transition>

              <!-- action: plain description -->
              <Transition :css="false" @enter="onDailyEnter" @leave="onDailyLeave">
                <div v-if="q.kind !== 'quiz' && openDaily === i && q.description" class="overflow-hidden">
                  <p class="m-0 px-4 pb-4 pt-0 text-[13px] leading-relaxed text-ink-2 border-t border-line">
                    <span class="block pt-3">{{ q.description }}</span>
                  </p>
                </div>
              </Transition>
            </div>
          </div>
        </div>
      </div>
    </div>

    <ChallengeSubmitModal
      v-if="submitOpen"
      :challenge="selectedChallenge"
      @close="submitOpen = false"
      @submitted="onSubmitted"
    />
  </section>
</template>
