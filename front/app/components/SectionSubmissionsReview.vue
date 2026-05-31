<script setup lang="ts">
import { ref, computed, onMounted, reactive, watch } from 'vue'
import type { ChallengeSubmission, SubmissionStatus, ChallengeTaskLevel } from '~/types/landing'

const { submissions, loading, fetch, review } = useSubmissions()
const strapiBase = (useRuntimeConfig().public as any)?.strapi?.url ?? 'http://localhost:1337'

onMounted(() => { void fetch() })

const mediaUrl = (url: string): string => {
  if (!url) return '#'
  return /^https?:\/\//.test(url) ? url : `${strapiBase}${url}`
}

const levelMeta: Record<ChallengeTaskLevel, { label: string; cls: string }> = {
  light:  { label: 'LIGHT',  cls: 'text-mint-brand border-[rgba(82,242,197,0.4)] bg-[rgba(82,242,197,0.08)]' },
  medium: { label: 'MEDIUM', cls: 'text-cyan-brand border-[rgba(24,239,242,0.4)] bg-[rgba(24,239,242,0.08)]' },
  hard:   { label: 'HARD',   cls: 'text-purple-brand border-[rgba(181,89,243,0.4)] bg-[rgba(181,89,243,0.08)]' },
}
const levelOf = (s: ChallengeSubmission) => levelMeta[(s.challenge?.level as ChallengeTaskLevel) ?? 'light'] ?? levelMeta.light

const statusMeta: Record<SubmissionStatus, { label: string; cls: string }> = {
  pending:  { label: 'На проверке', cls: 'text-ink-2 border-line-strong bg-bg-3' },
  approved: { label: 'Зачтено',     cls: 'text-mint-brand border-[rgba(82,242,197,0.4)] bg-[rgba(82,242,197,0.08)]' },
  partial:  { label: 'Частично',    cls: 'text-cyan-brand border-[rgba(24,239,242,0.4)] bg-[rgba(24,239,242,0.08)]' },
  rejected: { label: 'Отклонено',   cls: 'text-[#ff7575] border-[rgba(255,117,117,0.35)] bg-[rgba(255,117,117,0.08)]' },
}

const pending  = computed(() => submissions.value.filter(s => s.status === 'pending'))
const reviewed = computed(() => submissions.value.filter(s => s.status !== 'pending'))

// Per-submission draft state for the review form (xp override + note).
// Entries are created in a watcher (not during render) so the template never
// mutates reactive state while rendering — that would crash the component.
const drafts = reactive<Record<number, { xp: string; note: string }>>({})
watch(pending, (list) => {
  for (const s of list) if (!drafts[s.id]) drafts[s.id] = { xp: '', note: '' }
}, { immediate: true })
const draftFor = (id: number) => drafts[id] ?? { xp: '', note: '' }
const busy = ref<Set<number>>(new Set())
const isBusy = (id: number) => busy.value.has(id)

const decide = async (s: ChallengeSubmission, decision: SubmissionStatus) => {
  if (isBusy(s.id)) return
  const d = draftFor(s.id)
  const xpNum = d.xp.trim() === '' ? undefined : Math.max(0, Number(d.xp) || 0)
  busy.value = new Set(busy.value).add(s.id)
  try {
    await review(s.id, decision, decision === 'rejected' ? undefined : xpNum, d.note.trim() || undefined)
  } finally {
    const next = new Set(busy.value); next.delete(s.id); busy.value = next
  }
}

const fmtDate = (iso?: string | null) => {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleString('ru-RU', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
  } catch { return '' }
}
</script>

<template>
  <section id="review" class="py-[90px] relative scroll-mt-24">
    <div class="max-w-[1100px] mx-auto px-8">
      <SectionHeader tag="Проверка" tag-color="var(--color-cyan-brand)" sub="Участники сдают челленджи на проверку. Посмотри решение и вложения, затем зачисли выполнение, поставь частичный зачёт или отклони с комментарием.">
        <template #title>
          Проверка <span class="text-cyan-brand">сдач</span>
        </template>
      </SectionHeader>

      <!-- pending queue -->
      <div class="flex items-center justify-between mb-5">
        <h4 class="font-mono text-[11px] tracking-[0.14em] text-ink-3 uppercase m-0 flex items-center gap-2.5 before:content-[''] before:w-2 before:h-2 before:bg-cyan-brand">
          Ожидают проверки
          <span v-if="pending.length" class="text-cyan-brand">· {{ pending.length }}</span>
        </h4>
        <button type="button" class="font-mono text-[10px] tracking-[0.1em] uppercase text-ink-3 hover:text-ink-2" :disabled="loading" @click="fetch()">
          {{ loading ? 'Обновляем…' : 'Обновить' }}
        </button>
      </div>

      <p v-if="!pending.length" class="text-sm text-ink-3 py-10 text-center bg-bg-2 border border-line rounded-[18px]">
        Новых сдач на проверку нет.
      </p>

      <div v-else class="flex flex-col gap-4">
        <div
          v-for="s in pending"
          :key="s.id"
          class="bg-bg-2 border border-line rounded-[18px] p-6"
        >
          <div class="flex items-start gap-3 flex-wrap">
            <span :class="['shrink-0 inline-flex items-center font-mono text-[10px] tracking-[0.1em] uppercase px-2.5 py-1 rounded-full border', levelOf(s).cls]">
              {{ levelOf(s).label }}
            </span>
            <div class="flex-1 min-w-[200px]">
              <div class="text-[15px] font-semibold text-ink">{{ s.challenge?.title ?? 'Челлендж' }}</div>
              <div class="font-mono text-[11px] text-ink-3 mt-1">
                {{ s.participant?.name ?? 'Участник' }} · {{ fmtDate(s.createdAt) }}
              </div>
            </div>
            <div class="font-pix text-[18px] text-cyan-brand whitespace-nowrap">+{{ s.challenge?.xp ?? 0 }} XP</div>
          </div>

          <!-- participant's comment -->
          <div class="mt-4 bg-bg-3 border border-line rounded-xl p-4">
            <div class="font-mono text-[9px] tracking-[0.14em] uppercase text-ink-3 mb-2">Комментарий участника</div>
            <p v-if="s.comment" class="m-0 text-[14px] leading-relaxed text-ink whitespace-pre-line">{{ s.comment }}</p>
            <p v-else class="m-0 text-[13px] italic text-ink-3">— без комментария —</p>
          </div>

          <!-- attachments -->
          <div v-if="s.attachments.length" class="mt-3 flex flex-wrap gap-2">
            <a
              v-for="a in s.attachments"
              :key="a.id"
              :href="mediaUrl(a.url)"
              target="_blank"
              rel="noopener"
              class="inline-flex items-center gap-2 py-2 px-3 bg-bg-3 border border-line rounded-lg text-[13px] text-ink-2 hover:border-cyan-brand hover:text-cyan-brand transition-colors"
            >
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
              </svg>
              <span class="truncate max-w-[180px]">{{ a.name }}</span>
            </a>
          </div>

          <!-- review controls -->
          <div class="mt-5 pt-4 border-t border-line grid gap-3 sm:grid-cols-[140px_1fr] items-start">
            <div>
              <label class="block font-mono text-[9px] tracking-[0.14em] uppercase text-ink-3 mb-1.5">XP (опционально)</label>
              <input
                v-model="draftFor(s.id).xp"
                type="number"
                min="0"
                :placeholder="String(s.challenge?.xp ?? 0)"
                class="w-full py-2.5 px-3 bg-bg border border-line-strong rounded-[10px] text-ink text-[14px] outline-none focus:border-cyan-brand"
              />
            </div>
            <div>
              <label class="block font-mono text-[9px] tracking-[0.14em] uppercase text-ink-3 mb-1.5">Комментарий к проверке (опционально)</label>
              <input
                v-model="draftFor(s.id).note"
                type="text"
                placeholder="Что хорошо, что доработать…"
                class="w-full py-2.5 px-3 bg-bg border border-line-strong rounded-[10px] text-ink text-[14px] outline-none focus:border-cyan-brand"
              />
            </div>
          </div>

          <div class="mt-4 flex flex-wrap gap-2.5">
            <button type="button" class="rv-btn rv-approve font-mono" :disabled="isBusy(s.id)" @click="decide(s, 'approved')">
              Зачесть {{ draftFor(s.id).xp.trim() ? `(+${draftFor(s.id).xp} XP)` : `(+${s.challenge?.xp ?? 0} XP)` }}
            </button>
            <button type="button" class="rv-btn rv-partial font-mono" :disabled="isBusy(s.id)" @click="decide(s, 'partial')">
              Частично
            </button>
            <button type="button" class="rv-btn rv-reject font-mono" :disabled="isBusy(s.id)" @click="decide(s, 'rejected')">
              Отклонить
            </button>
          </div>
        </div>
      </div>

      <!-- reviewed history -->
      <div v-if="reviewed.length" class="mt-12">
        <h4 class="font-mono text-[11px] tracking-[0.14em] text-ink-3 uppercase m-0 mb-5 flex items-center gap-2.5 before:content-[''] before:w-2 before:h-2 before:bg-mint-brand">
          История проверок
        </h4>
        <div class="flex flex-col gap-2.5">
          <div
            v-for="s in reviewed"
            :key="s.id"
            class="bg-bg-2 border border-line rounded-xl p-4 flex items-center gap-3 flex-wrap"
          >
            <span :class="['shrink-0 inline-flex items-center font-mono text-[9px] tracking-[0.1em] uppercase px-2 py-0.5 rounded-full border', statusMeta[s.status].cls]">
              {{ statusMeta[s.status].label }}
            </span>
            <div class="flex-1 min-w-[160px]">
              <span class="text-[14px] text-ink">{{ s.challenge?.title ?? 'Челлендж' }}</span>
              <span class="font-mono text-[11px] text-ink-3"> · {{ s.participant?.name ?? 'Участник' }}</span>
            </div>
            <span v-if="s.reviewNote" class="font-mono text-[11px] text-ink-3 italic max-w-[260px] truncate">«{{ s.reviewNote }}»</span>
            <span class="font-pix text-[14px] shrink-0" :class="s.status === 'rejected' ? 'text-ink-3' : 'text-mint-brand'">
              {{ s.status === 'rejected' ? '—' : `+${s.awardedXp ?? 0}` }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.rv-btn {
  padding: 10px 16px;
  border-radius: 10px;
  font-size: 11px;
  letter-spacing: .06em;
  text-transform: uppercase;
  cursor: pointer;
  border: 1px solid transparent;
  transition: transform 150ms, opacity 150ms, background 150ms;
}
.rv-btn:disabled { opacity: .5; cursor: progress; }
.rv-btn:hover:not(:disabled) { transform: translateY(-1px); }
.rv-approve { background: var(--color-mint-brand); color: var(--color-btn-ink); }
.rv-partial {
  background: rgba(24, 239, 242, 0.1);
  border-color: var(--color-cyan-brand);
  color: var(--color-cyan-brand);
}
.rv-reject {
  background: rgba(255, 117, 117, 0.1);
  border-color: rgba(255, 117, 117, 0.4);
  color: #ff7575;
}
</style>
