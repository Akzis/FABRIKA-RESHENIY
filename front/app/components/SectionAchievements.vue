<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import type { UserProfile } from '~/types/user'
import type { Badge, Accent } from '~/types/landing'

const { badges: storeBadges } = useLandingData()
const user = useStrapiUser<UserProfile>()

// The shared landing store hydrates unreliably (SSR payload sometimes doesn't
// reach the client, dropping CMS images). To guarantee badge pictures load, the
// section fetches badges itself on the client and uses that when available,
// falling back to the store/defaults otherwise.
const accentSafe = (a: unknown): Accent => (a === 'mint' || a === 'purple' || a === 'cyan' ? a : 'cyan')
const strapiBase = (useRuntimeConfig().public as any)?.strapi?.url ?? 'http://localhost:1337'
// Build an absolute media URL ourselves — useStrapiMedia() is unreliable in this
// @nuxtjs/strapi version and throws, which previously aborted the whole fetch.
const toMediaUrl = (url: string) => (/^https?:\/\//.test(url) ? url : `${strapiBase}${url.startsWith('/') ? '' : '/'}${url}`)
const fetchedBadges = ref<Badge[] | null>(null)

onMounted(async () => {
  try {
    const res = await $fetch<{ data?: any[] }>(`${strapiBase}/api/badges`, {
      params: { 'populate[0]': 'image', 'sort[0]': 'order:asc' },
    })
    const rows = res?.data ?? []
    if (rows.length) {
      fetchedBadges.value = rows.map((b: any): Badge => ({
        id: b.id,
        code: typeof b.code === 'string' ? b.code : undefined,
        label: b.label,
        accent: accentSafe(b.accent),
        locked: !!b.locked,
        conditionType: b.conditionType ?? 'none',
        conditionValue: Number(b.conditionValue ?? 0),
        xpReward: Number(b.xpReward ?? 0),
        rewardImage: typeof b.rewardImage === 'string' && b.rewardImage ? b.rewardImage : null,
        image: b.image?.url ? toMediaUrl(b.image.url) : undefined,
      }))
    }
  } catch { /* keep store/defaults */ }
})

const badges = computed(() => (fetchedBadges.value?.length ? fetchedBadges.value : storeBadges.value))

const accentVar: Record<string, string> = {
  cyan: 'var(--color-cyan-brand)',
  mint: 'var(--color-mint-brand)',
  purple: 'var(--color-purple-brand)',
}
const accentOf = (b: Badge) => accentVar[b.accent ?? 'cyan']

// Only the picture uploaded to Strapi (`image`) is shown. If a badge has no
// image, the coin stays empty — no glyph, no fallback.
const pictureOf = (b: Badge): string | null => b.image || null

// Earned badges come from /api/users/me (earnedBadges). Fresh account → none.
// Match by `code` (stable across draft/published); fall back to numeric id.
const earnedCodes = computed(() => new Set((user.value?.earnedBadges ?? []).map(b => b.code).filter(Boolean)))
const earnedIds = computed(() => new Set((user.value?.earnedBadges ?? []).map(b => b.id)))
const isGot = (b: Badge) =>
  (!!b.code && earnedCodes.value.has(b.code)) || (b.id != null && earnedIds.value.has(b.id))
const earnedCount = computed(() => badges.value.filter(isGot).length)
const totalCount = computed(() => badges.value.length)
const earnedPct = computed(() => (totalCount.value ? Math.round((earnedCount.value / totalCount.value) * 100) : 0))

// Accordion: one badge open at a time. Detail renders in a panel below the grid.
const activeIndex = ref<number | null>(null)
const detailBadge = ref<Badge | null>(null)
const toggle = (i: number) => { activeIndex.value = activeIndex.value === i ? null : i }

const requirementOf = (b: Badge | null): string => {
  if (!b) return ''
  const v = b.conditionValue ?? 0
  switch (b.conditionType) {
    case 'first_light_challenge':  return 'Выполни свой первый LIGHT-челлендж'
    case 'first_medium_challenge': return 'Выполни свой первый MEDIUM-челлендж'
    case 'first_hard_challenge':   return 'Сдай свой первый HARD-челлендж'
    case 'reach_level':            return `Достигни ${v} уровня`
    case 'complete_dailies':       return `Выполни ${v} дейли-заданий`
    case 'streak_days':            return `Держи дейли-серию ${v} дней подряд`
    case 'complete_challenges':    return `Закрой ${v} челленджей`
    default:                       return 'Секретный бейдж — условие скрыто'
  }
}
const statusInfo = (b: Badge | null): { icon: string; text: string } => {
  if (!b) return { icon: '', text: '' }
  if (isGot(b)) return { icon: 'i-lucide-circle-check', text: 'Получено' }
  if (b.locked) return { icon: 'i-lucide-lock', text: 'Заблокировано' }
  return { icon: 'i-lucide-circle-dashed', text: 'Ещё не получено' }
}

// What the badge pays out: XP + (optionally) a profile picture you can only get here.
const rewardOf = (b: Badge | null): string => {
  if (!b) return ''
  const parts: string[] = []
  if (b.xpReward) parts.push(`+${b.xpReward} XP`)
  if (b.rewardImage) parts.push('картинка для профиля')
  return parts.join(' · ')
}

// ── GSAP plumbing ───────────────────────────────────────────────────────
let gsap: any = null
const ensureGsap = async () => {
  if (gsap) return gsap
  const mod = await import('gsap')
  gsap = (mod as any).gsap ?? mod.default
  return gsap
}
const reduced = () => import.meta.client && window.matchMedia('(prefers-reduced-motion: reduce)').matches

// Hover: lift the card and pop the coin with a springy ease.
const onEnter = async (e: PointerEvent) => {
  if (reduced()) return
  const g = await ensureGsap()
  const card = e.currentTarget as HTMLElement
  g.to(card, { y: -8, duration: 0.35, ease: 'power3.out' })
  g.to(card.querySelector('.coin'), { scale: 1.14, rotate: -5, duration: 0.5, ease: 'back.out(3)' })
}
const onLeave = async (e: PointerEvent) => {
  if (reduced()) return
  const g = await ensureGsap()
  const card = e.currentTarget as HTMLElement
  g.to(card, { y: 0, duration: 0.45, ease: 'power3.out' })
  g.to(card.querySelector('.coin'), { scale: 1, rotate: 0, duration: 0.5, ease: 'power3.out' })
}

// Detail panel open/close — animate height + stagger the inner lines.
const detailRef = ref<HTMLElement | null>(null)
const showDetail = ref(false)
let prevIndex: number | null = null

const collapse = async () => {
  const el = detailRef.value
  const g = await ensureGsap()
  if (!el || reduced()) { if (el) g?.set?.(el, { height: 0 }); showDetail.value = false; return }
  g.killTweensOf(el)
  g.to(el, { height: 0, opacity: 0, duration: 0.32, ease: 'power3.inOut', onComplete: () => { showDetail.value = false } })
}
const expand = async (wasOpen: boolean) => {
  showDetail.value = true
  await nextTick()
  const el = detailRef.value
  const g = await ensureGsap()
  if (!el) return
  if (reduced()) { g.set(el, { height: 'auto', opacity: 1 }); return }
  g.killTweensOf(el)
  g.set(el, { height: 'auto', opacity: 1 })
  const h = el.offsetHeight
  if (!wasOpen) {
    g.fromTo(el, { height: 0, opacity: 0 }, { height: h, opacity: 1, duration: 0.5, ease: 'power3.out', onComplete: () => g.set(el, { height: 'auto' }) })
  }
  g.from(el.querySelectorAll('.d-stagger'), { y: 18, opacity: 0, duration: 0.55, stagger: 0.08, ease: 'power3.out', delay: wasOpen ? 0 : 0.12 })
  g.from(el.querySelector('.d-coin'), { scale: 0.5, rotate: -14, duration: 0.6, ease: 'back.out(2.2)', delay: wasOpen ? 0 : 0.08 })
}

watch(activeIndex, (n) => {
  const wasOpen = prevIndex !== null
  if (n === null) collapse()
  else { detailBadge.value = badges.value[n] ?? null; expand(wasOpen) }
  prevIndex = n
})

// Entrance: progress bar fill + earned-count count-up, scroll-triggered.
const progressRef = ref<HTMLElement | null>(null)
const countRef = ref<HTMLElement | null>(null)
onMounted(async () => {
  if (!import.meta.client || reduced()) return
  const g = await ensureGsap()
  const { ScrollTrigger } = await import('gsap/ScrollTrigger')
  g.registerPlugin(ScrollTrigger)
  await new Promise<void>((r) => requestAnimationFrame(() => r()))

  if (progressRef.value) {
    g.fromTo(progressRef.value, { width: '0%' }, {
      width: earnedPct.value + '%', duration: 1.1, ease: 'power3.out',
      scrollTrigger: { trigger: '.ach-wrap', start: 'top 80%' },
    })
  }
  if (countRef.value) {
    const obj = { v: 0 }
    g.to(obj, {
      v: earnedCount.value, duration: 1.1, ease: 'power2.out',
      scrollTrigger: { trigger: '.ach-wrap', start: 'top 80%' },
      onUpdate: () => { if (countRef.value) countRef.value.textContent = String(Math.round(obj.v)) },
    })
  }
})

useReveal('.ach-grid .badge', { stagger: 0.07, y: 26, scale: 0.55, rotation: -6, duration: 0.7, ease: 'back.out(2)', trigger: '.ach-grid', delay: 0.2 })
</script>

<template>
  <section id="achievements" class="py-16 sm:py-[110px] relative">
    <div class="max-w-[1320px] mx-auto px-4 sm:px-8">
      <SectionHeader tag="Награды и достижения" tag-color="var(--color-purple-brand)" sub="Бейджи выдаются автоматически за активность и серии. Нажми на любой — увидишь, что нужно сделать, чтобы его получить.">
        <template #title>
          Каждое<br />усилие — <span class="text-purple-brand">бейдж</span>
        </template>
      </SectionHeader>

      <div class="ach-wrap">
        <div class="ach-top">
          <span class="ach-top-label font-mono">Коллекция бейджей</span>
          <span class="ach-top-count font-mono">
            <b ref="countRef" class="text-cyan-brand">{{ earnedCount }}</b> / {{ totalCount }}
          </span>
        </div>
        <div class="ach-progress"><i ref="progressRef" :style="{ width: earnedPct + '%' }" /></div>

        <div class="ach-grid grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3.5">
          <button
            v-for="(b, i) in badges"
            :key="i"
            type="button"
            class="badge"
            :class="{ 'is-earned': isGot(b), 'is-locked': b.locked, 'is-active': activeIndex === i }"
            :style="{ '--acc': accentOf(b) }"
            :aria-expanded="activeIndex === i"
            @click="toggle(i)"
            @pointerenter="onEnter"
            @pointerleave="onLeave"
          >
            <span class="coin">
              <img v-if="pictureOf(b)" :src="pictureOf(b)!" :alt="b.label" class="coin-img" />
            </span>
            <span class="blabel font-mono">{{ b.label }}</span>

            <span v-if="isGot(b)" class="chip chip-got"><UIcon name="i-lucide-check" /></span>
            <span v-else-if="b.locked" class="chip chip-lock"><UIcon name="i-lucide-lock" /></span>
          </button>
        </div>

        <!-- expandable detail -->
        <div ref="detailRef" class="ach-detail">
          <div
            v-if="showDetail && detailBadge"
            class="ach-detail-inner"
            :class="{ 'is-got': isGot(detailBadge) }"
            :style="{ '--acc': accentOf(detailBadge) }"
          >
            <span class="coin coin-lg d-coin">
              <img v-if="pictureOf(detailBadge)" :src="pictureOf(detailBadge)!" :alt="detailBadge.label" class="coin-img" />
            </span>
            <div class="d-text">
              <div class="d-kicker d-stagger font-mono">{{ detailBadge.label }} · что нужно</div>
              <div class="d-req d-stagger">{{ requirementOf(detailBadge) }}</div>
              <div v-if="rewardOf(detailBadge)" class="d-reward d-stagger">
                <img
                  v-if="detailBadge.rewardImage"
                  :src="detailBadge.rewardImage"
                  :alt="`Картинка профиля за «${detailBadge.label}»`"
                  class="d-reward-img"
                />
                <div class="d-reward-body font-mono">
                  <div class="d-reward-text">Награда: <b>{{ rewardOf(detailBadge) }}</b></div>
                  <div v-if="detailBadge.rewardImage" class="d-reward-note">
                    Эту картинку для профиля можно получить только за этот бейдж
                  </div>
                </div>
              </div>
            </div>
            <div class="d-status d-stagger font-mono" :class="{ 'is-got': isGot(detailBadge) }">
              <UIcon :name="statusInfo(detailBadge).icon" class="d-status-ic" />
              {{ statusInfo(detailBadge).text }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
/* ── wrap ── */
.ach-wrap { position: relative; margin-top: 8px; }

/* ── header + progress ── */
.ach-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}
.ach-top-label { font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--color-ink-3); }
.ach-top-count { font-size: 12px; letter-spacing: 0.06em; color: var(--color-ink-3); }
.ach-top-count b { font-weight: 700; }
.ach-progress {
  height: 6px;
  background: var(--color-bg-3);
  border-radius: 999px;
  overflow: hidden;
  margin-bottom: 26px;
}
.ach-progress > i {
  display: block;
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, var(--color-cyan-brand), var(--color-purple-brand));
  box-shadow: 0 0 12px rgba(24, 239, 242, 0.45);
}

/* ── badge card ── */
.badge {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 22px 12px 18px;
  border-radius: 18px;
  background: transparent;
  border: none;
  cursor: pointer;
  text-align: center;
  will-change: transform;
}
.badge.is-locked { opacity: 0.62; }
.badge.is-active .coin {
  box-shadow: none;
}

.coin {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 84px;
  height: 84px;
  border-radius: 22px;
  background: transparent;
  border: 1px solid color-mix(in srgb, var(--acc) 55%, transparent);
  will-change: transform;
  overflow: hidden;
}
.coin-lg { width: 96px; height: 96px; border-radius: 24px; }
.coin-img { width: 100%; height: 100%; object-fit: contain; filter: none; }
.badge:not(.is-earned) .coin-img { filter: grayscale(1); opacity: 0.6; }

/* earned sheen sweeping across the coin */
.badge.is-earned .coin::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(115deg, transparent 30%, rgba(255, 255, 255, 0.4) 50%, transparent 70%);
  transform: translateX(-130%);
  animation: coinShine 4.2s ease-in-out infinite;
}
@keyframes coinShine { 0% { transform: translateX(-130%); } 16%, 100% { transform: translateX(130%); } }

.blabel {
  position: relative;
  z-index: 1;
  font-size: 10px;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: var(--color-ink-3);
}
.badge.is-earned .blabel { color: var(--color-ink-2); }

.chip {
  position: absolute;
  top: 9px;
  right: 9px;
  z-index: 2;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 19px;
  height: 19px;
  border-radius: 50%;
  font-size: 10px;
  line-height: 1;
}
.chip-got {
  color: var(--color-btn-ink);
  background: var(--acc);
  box-shadow: none;
}
.chip-lock { opacity: 0.7; }

/* ── detail panel ── */
.ach-detail { overflow: hidden; height: 0; width: 100%; grid-column: 1 / -1; }
.ach-detail-inner {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 20px;
  align-items: center;
  width: 100%;
  margin-top: 14px;
  padding: 10px 4px 18px;
  border: none;
  background: transparent;
}
.d-text { min-width: 0; }
.d-kicker {
  font-size: 9px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--color-ink-3);
  margin-bottom: 6px;
}
.d-req { font-size: 16px; line-height: 1.3; color: var(--color-ink); }
.d-reward {
  margin-top: 12px;
  display: flex;
  align-items: center;
  gap: 12px;
}
.d-reward-img {
  width: 46px;
  height: 46px;
  flex-shrink: 0;
  object-fit: contain;
  padding: 0;
  border-radius: 14px;
  background: transparent;
  border: 1px solid color-mix(in srgb, var(--acc) 55%, transparent);
  filter: none;
}
.d-reward-body { min-width: 0; }
.d-reward-text {
  font-size: 12px;
  letter-spacing: 0.04em;
  color: var(--color-ink-2);
}
.d-reward-text b { color: inherit; }
.d-reward-note {
  margin-top: 2px;
  font-size: 10px;
  line-height: 1.35;
  color: var(--color-ink-3);
}
.d-status {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 13px;
  border-radius: 999px;
  font-size: 10px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  white-space: nowrap;
  color: var(--color-ink-3);
  border: 1px solid var(--color-line);
  background: var(--color-bg-2);
}
.d-status-ic { width: 13px; height: 13px; }
.d-status.is-got {
  color: var(--color-btn-ink);
  background: var(--acc);
  border-color: var(--acc);
}

@media (max-width: 560px) {
  .ach-plate { padding: 22px; }
  .ach-detail-inner { grid-template-columns: auto 1fr; row-gap: 14px; }
  .d-status { grid-column: 1 / -1; text-align: center; }
}
</style>
