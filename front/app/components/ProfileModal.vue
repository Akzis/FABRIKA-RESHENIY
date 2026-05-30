<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import type { UserProfile } from '~/types/user'

interface Props {
  open: boolean
  originRect?: DOMRect | null
}
const props = defineProps<Props>()
const emit = defineEmits<{ (e: 'close'): void }>()

const user = useStrapiUser() as unknown as { value: UserProfile | null }
const u = computed(() => user.value)

const displayName = computed(() => u.value?.displayName || u.value?.username || 'Игрок')
const username    = computed(() => u.value?.username ?? '—')
const email       = computed(() => u.value?.email ?? '—')
const initial     = computed(() => (displayName.value[0] ?? '?').toUpperCase())
const roleLabel   = computed(() => (u.value?.teamRole === 'pm' ? 'PM' : 'участник'))
const teamLine    = computed(() =>
  u.value?.team ? `${roleLabel.value} команды «${u.value.team}»` : 'роль не назначена',
)

const lvl         = computed(() => u.value?.level ?? 1)
const xp          = computed(() => u.value?.xp ?? 0)
const xpToNext    = computed(() => Math.max(u.value?.xpToNextLevel ?? 100, 1))
const xpTotal     = computed(() => xp.value + xpToNext.value)
const xpPercent   = computed(() => Math.min(100, Math.round((xp.value / xpTotal.value) * 100)))

const streak        = computed(() => u.value?.streak ?? 0)
const streakPercent = computed(() => Math.min(100, Math.round((streak.value / 30) * 100)))

const cupPlace   = computed(() => u.value?.teamCupPlace ?? 0)
const cupCurrent = computed(() => u.value?.teamCupCurrent ?? 0)
const cupTotal   = computed(() => Math.max(u.value?.teamCupTotal ?? 10000, 1))
const cupPercent = computed(() => Math.min(100, Math.round((cupCurrent.value / cupTotal.value) * 100)))

const challengesClosed = computed(() => u.value?.challengesClosed ?? 0)
const badgesCount      = computed(() => u.value?.badgesCount ?? 0)

const fmt = (n: number) => n.toLocaleString('ru-RU').replace(/,/g, ' ')

const backdropRef = ref<HTMLElement | null>(null)
const cardRef     = ref<HTMLElement | null>(null)

const onEsc = (e: KeyboardEvent) => {
  if (e.key === 'Escape') animateOutAndClose()
}

let gsapRef: any = null
const loadGsap = async () => {
  if (gsapRef) return gsapRef
  const mod = await import('gsap')
  gsapRef = (mod as any).gsap ?? mod.default
  return gsapRef
}

const animateIn = async () => {
  const gsap = await loadGsap()
  await nextTick()
  if (!cardRef.value || !backdropRef.value) return

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  if (reduced) {
    gsap.set(backdropRef.value, { autoAlpha: 1 })
    gsap.set(cardRef.value, { autoAlpha: 1, scale: 1, y: 0, filter: 'blur(0px)' })
    return
  }

  // start: small, blurred, pulled toward the button (top-right)
  gsap.set(backdropRef.value, { autoAlpha: 0 })
  gsap.set(cardRef.value, {
    autoAlpha: 0,
    scale: 0.72,
    y: -18,
    filter: 'blur(12px)',
    transformOrigin: 'top right',
  })

  const tl = gsap.timeline()

  // backdrop fades in subtly
  tl.to(backdropRef.value, { autoAlpha: 1, duration: 0.25, ease: 'power2.out' }, 0)

  // card expands from top-right
  tl.to(
    cardRef.value,
    {
      autoAlpha: 1,
      scale: 1,
      y: 0,
      filter: 'blur(0px)',
      duration: 0.55,
      ease: 'expo.out',
      transformOrigin: 'top right',
    },
    0.04,
  )

  // stagger content rows
  tl.from(
    cardRef.value!.querySelectorAll('.pm-stagger'),
    { y: 14, opacity: 0, duration: 0.45, stagger: 0.055, ease: 'power3.out' },
    0.18,
  )

  // bars fill
  tl.from(
    cardRef.value!.querySelectorAll('.pm-bar > i'),
    { width: 0, duration: 1.0, stagger: 0.1, ease: 'expo.out' },
    0.28,
  )

  // count-up
  cardRef.value.querySelectorAll<HTMLElement>('.pm-count').forEach((el) => {
    const target = Number(el.dataset.target ?? '0')
    const obj = { v: 0 }
    gsap.to(obj, {
      v: target,
      duration: 1.1,
      ease: 'power2.out',
      delay: 0.22,
      onUpdate: () => { el.textContent = fmt(Math.round(obj.v)) },
    })
  })
}

const animateOutAndClose = async () => {
  const gsap = await loadGsap()
  if (!cardRef.value || !backdropRef.value) { emit('close'); return }
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (reduced) { emit('close'); return }

  const tl = gsap.timeline({ onComplete: () => emit('close') })
  tl.to(
    cardRef.value,
    {
      autoAlpha: 0,
      scale: 0.82,
      y: -12,
      filter: 'blur(10px)',
      duration: 0.28,
      ease: 'power2.in',
      transformOrigin: 'top right',
    },
    0,
  )
  tl.to(backdropRef.value, { autoAlpha: 0, duration: 0.22, ease: 'power2.in' }, 0.04)
}

const onBackdropClick = (e: MouseEvent) => {
  if (e.target === backdropRef.value) animateOutAndClose()
}

watch(
  () => props.open,
  async (isOpen) => {
    if (isOpen) {
      document.addEventListener('keydown', onEsc)
      await nextTick()
      animateIn()
    } else {
      document.removeEventListener('keydown', onEsc)
    }
  },
)

onBeforeUnmount(() => {
  document.removeEventListener('keydown', onEsc)
})

defineExpose({ animateOutAndClose })
</script>

<template>
  <Teleport to="body">
    <div v-if="open">
      <!-- click-away layer (no scroll lock, no heavy blur) -->
      <div ref="backdropRef" class="pm-backdrop" @click="onBackdropClick" />

      <!-- panel anchored top-right -->
      <div
        ref="cardRef"
        class="pm-card"
        role="dialog"
        aria-modal="true"
        :aria-label="`Профиль ${displayName}`"
      >
        <!-- animated glows -->
        <div class="pm-glow pm-glow-a" />
        <div class="pm-glow pm-glow-b" />

        <!-- arrow notch -->
        <div class="pm-notch" />

        <button class="pm-close" aria-label="Закрыть" @click="animateOutAndClose">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>

        <!-- HEADER -->
        <div class="pm-header pm-stagger">
          <div class="pm-avatar-wrap">
            <div class="pm-avatar-pulse" />
            <div class="pm-avatar font-pix">{{ initial }}</div>
          </div>
          <div class="pm-id">
            <div class="pm-name font-pix">{{ displayName }}</div>
            <div class="pm-sub font-mono">@{{ username }}</div>
            <div class="pm-team font-mono">{{ teamLine }}</div>
          </div>
          <div class="pm-level font-pix" aria-label="Уровень">
            <span class="pm-level-label">LVL</span>
            <span class="pm-level-num">{{ lvl }}</span>
          </div>
        </div>

        <!-- STAT CHIPS -->
        <div class="pm-stats">
          <div class="pm-stat pm-stagger">
            <div class="pm-stat-num text-cyan-brand font-pix"><span class="pm-count" :data-target="xp">0</span></div>
            <div class="pm-stat-cap font-mono">всего XP</div>
          </div>
          <div class="pm-stat pm-stagger">
            <div class="pm-stat-num text-mint-brand font-pix"><span class="pm-count" :data-target="streak">0</span></div>
            <div class="pm-stat-cap font-mono">дней подряд</div>
          </div>
          <div class="pm-stat pm-stagger">
            <div class="pm-stat-num text-cyan-brand font-pix"><span class="pm-count" :data-target="challengesClosed">0</span></div>
            <div class="pm-stat-cap font-mono">челленджей</div>
          </div>
          <div class="pm-stat pm-stagger">
            <div class="pm-stat-num text-purple-brand font-pix"><span class="pm-count" :data-target="badgesCount">0</span></div>
            <div class="pm-stat-cap font-mono">бейджей</div>
          </div>
        </div>

        <!-- PROGRESS BARS -->
        <div class="pm-bars">
          <div class="pm-bar-block pm-stagger">
            <div class="pm-bar-head">
              <span class="font-mono">Опыт до {{ lvl + 1 }} уровня</span>
              <span class="font-mono"><b class="text-ink">{{ fmt(xp) }}</b> / {{ fmt(xpTotal) }} XP</span>
            </div>
            <div class="pm-bar"><i class="pm-bar-xp" :style="{ width: xpPercent + '%' }" /></div>
          </div>
          <div class="pm-bar-block pm-stagger">
            <div class="pm-bar-head">
              <span class="font-mono">Дейли-серия</span>
              <span class="font-mono"><b class="text-ink">{{ streak }}</b> {{ streak === 1 ? 'день' : 'дней' }}</span>
            </div>
            <div class="pm-bar"><i class="pm-bar-streak" :style="{ width: streakPercent + '%' }" /></div>
          </div>
          <div class="pm-bar-block pm-stagger">
            <div class="pm-bar-head">
              <span class="font-mono">Кубок команды</span>
              <span class="font-mono">
                <template v-if="cupPlace > 0"><b class="text-ink">{{ cupPlace }} место</b> · </template>
                {{ fmt(cupCurrent) }} / {{ fmt(cupTotal) }}
              </span>
            </div>
            <div class="pm-bar"><i class="pm-bar-cup" :style="{ width: cupPercent + '%' }" /></div>
          </div>
        </div>

        <!-- ACCOUNT -->
        <div class="pm-account pm-stagger">
          <div class="pm-acc-row">
            <span class="pm-acc-key font-mono">Логин</span>
            <span class="pm-acc-val font-mono">{{ username }}</span>
          </div>
          <div class="pm-acc-row">
            <span class="pm-acc-key font-mono">Почта</span>
            <span class="pm-acc-val font-mono">{{ email }}</span>
          </div>
          <div class="pm-acc-row">
            <span class="pm-acc-key font-mono">Команда</span>
            <span class="pm-acc-val font-mono">{{ u?.team || '—' }}</span>
          </div>
          <div class="pm-acc-row">
            <span class="pm-acc-key font-mono">Роль</span>
            <span class="pm-acc-val font-mono">{{ u?.teamRole === 'pm' ? 'Project Manager' : 'Участник' }}</span>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
/* ── click-away layer ── */
.pm-backdrop {
  position: fixed;
  inset: 0;
  z-index: 200;
  background: rgba(11, 11, 14, 0.25);
  backdrop-filter: blur(2px);
  -webkit-backdrop-filter: blur(2px);
  opacity: 0;
  will-change: opacity;
}
[data-theme="light"] .pm-backdrop {
  background: rgba(13, 13, 18, 0.15);
}

/* ── panel ── */
.pm-card {
  position: fixed;
  /* sits just below the 72px nav + 8px gap */
  top: 80px;
  right: 16px;
  z-index: 201;
  width: min(400px, calc(100vw - 32px));
  max-height: calc(100vh - 100px);
  overflow-y: auto;
  overflow-x: hidden;
  scrollbar-width: none;
  -ms-overflow-style: none;
  background: var(--color-panel-bg);
  border: 1px solid var(--color-line-strong);
  border-radius: 18px;
  padding: 22px 22px 20px;
  box-shadow:
    0 24px 60px -12px rgba(0, 0, 0, 0.65),
    0 0 0 1px rgba(255, 255, 255, 0.045) inset;
  opacity: 0;
  will-change: transform, opacity, filter;
  /* gradient border */
  --grad-border: linear-gradient(
    150deg,
    rgba(24, 239, 242, 0.5),
    rgba(181, 89, 243, 0.4) 50%,
    transparent 80%
  );
}
.pm-card::-webkit-scrollbar { display: none; width: 0; height: 0; }

.pm-card::before {
  content: '';
  position: absolute;
  inset: -1px;
  border-radius: 19px;
  background: var(--grad-border);
  -webkit-mask:
    linear-gradient(#000 0 0) content-box,
    linear-gradient(#000 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  pointer-events: none;
}

/* arrow notch pointing up-right toward the button */
.pm-notch {
  position: absolute;
  top: -7px;
  right: 28px;
  width: 14px;
  height: 7px;
  background: var(--color-panel-bg);
  clip-path: polygon(0 100%, 50% 0, 100% 100%);
  z-index: 2;
}
.pm-notch::before {
  content: '';
  position: absolute;
  top: -1px;
  left: -1px;
  right: -1px;
  bottom: 0;
  background: var(--color-line-strong);
  clip-path: polygon(0 100%, 50% 0, 100% 100%);
  z-index: -1;
}

/* glows */
.pm-glow {
  position: absolute;
  width: 200px;
  height: 200px;
  border-radius: 50%;
  filter: blur(55px);
  pointer-events: none;
  z-index: 0;
}
.pm-glow-a {
  top: -70px;
  right: -50px;
  background: var(--color-cyan-brand);
  opacity: 0.28;
  animation: pmGlowA 9s ease-in-out infinite;
}
.pm-glow-b {
  bottom: -70px;
  left: -50px;
  background: var(--color-purple-brand);
  opacity: 0.24;
  animation: pmGlowB 11s ease-in-out infinite;
}
@keyframes pmGlowA {
  0%,100% { transform: translate(0,0) scale(1);   opacity:.26; }
  50%     { transform: translate(-18px,20px) scale(1.1); opacity:.4; }
}
@keyframes pmGlowB {
  0%,100% { transform: translate(0,0) scale(1);   opacity:.22; }
  50%     { transform: translate(22px,-16px) scale(1.1); opacity:.36; }
}

.pm-card > *:not(.pm-glow):not(.pm-close):not(.pm-notch) {
  position: relative;
  z-index: 1;
}

/* close button */
.pm-close {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 3;
  width: 30px;
  height: 30px;
  border-radius: 9px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--color-ink-3);
  background: transparent;
  border: 1px solid var(--color-line);
  cursor: pointer;
  transition: color 150ms, border-color 150ms, transform 200ms cubic-bezier(0.34,1.56,0.64,1), background 150ms;
}
.pm-close:hover {
  color: var(--color-ink);
  border-color: var(--color-ink-2);
  background: var(--color-bg-3);
  transform: rotate(90deg);
}

/* HEADER */
.pm-header {
  display: grid;
  grid-template-columns: 62px 1fr auto;
  gap: 14px;
  align-items: center;
  padding-right: 44px;
  padding-bottom: 18px;
  border-bottom: 1px solid var(--color-line);
  margin-bottom: 18px;
}
.pm-avatar-wrap { position: relative; width: 62px; height: 62px; }
.pm-avatar {
  position: relative;
  z-index: 1;
  width: 62px;
  height: 62px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 28px;
  background: linear-gradient(135deg, var(--color-purple-brand), var(--color-cyan-brand));
  box-shadow: 0 0 0 1px var(--color-line-strong), 0 10px 24px -8px rgba(181,89,243,0.45);
}
.pm-avatar-pulse {
  position: absolute;
  inset: -5px;
  border-radius: 18px;
  background: linear-gradient(135deg, var(--color-purple-brand), var(--color-cyan-brand));
  opacity: 0.3;
  filter: blur(12px);
  animation: pmAvatarPulse 2.8s ease-in-out infinite;
}
@keyframes pmAvatarPulse {
  0%,100% { opacity:.22; transform: scale(.94); }
  50%     { opacity:.5;  transform: scale(1.07); }
}

.pm-id { min-width: 0; }
.pm-name {
  font-size: 22px;
  line-height: 1.1;
  color: var(--color-ink);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.pm-sub  { font-size: 11px; letter-spacing: .06em; color: var(--color-ink-3); margin-top: 3px; }
.pm-team { font-size: 10px; letter-spacing: .1em; text-transform: uppercase; color: var(--color-ink-3); margin-top: 5px; }

.pm-level {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
  color: var(--color-btn-ink);
  background: var(--color-cyan-brand);
  padding: 7px 11px;
  border-radius: 10px;
  box-shadow: 0 6px 18px -6px rgba(24,239,242,0.6);
  white-space: nowrap;
}
.pm-level-label { font-size: 9px; letter-spacing: .12em; opacity: .7; }
.pm-level-num   { font-size: 20px; line-height: 1; }

/* STATS */
.pm-stats {
  display: grid;
  grid-template-columns: repeat(4, minmax(0,1fr));
  gap: 8px;
  margin-bottom: 18px;
}
.pm-stat {
  padding: 12px 10px;
  background: var(--color-bg-3);
  border: 1px solid var(--color-line);
  border-radius: 12px;
  transition: transform 180ms ease, border-color 180ms ease;
}
.pm-stat:hover { transform: translateY(-2px); border-color: var(--color-line-strong); }
.pm-stat-num { font-size: 22px; line-height: 1; }
.pm-stat-cap { font-size: 9px; letter-spacing: .1em; text-transform: uppercase; color: var(--color-ink-3); margin-top: 5px; }

/* BARS */
.pm-bars { display: flex; flex-direction: column; gap: 12px; margin-bottom: 18px; }
.pm-bar-head {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: var(--color-ink-2);
  margin-bottom: 6px;
}
.pm-bar {
  height: 10px;
  background: var(--color-bg-3);
  border-radius: 999px;
  overflow: hidden;
}
.pm-bar > i {
  display: block;
  height: 100%;
  border-radius: 999px;
  position: relative;
}
.pm-bar > i::after {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  width: 60%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,.35), transparent);
  transform: translateX(-100%);
  animation: pmShimmer 2.4s ease-in-out infinite;
}
@keyframes pmShimmer {
  0%        { transform: translateX(-100%); }
  60%, 100% { transform: translateX(220%); }
}
.pm-bar-xp     { background: linear-gradient(90deg, var(--color-cyan-brand), var(--color-mint-brand)); box-shadow: 0 0 10px rgba(24,239,242,.4); }
.pm-bar-streak { background: var(--color-mint-brand); box-shadow: 0 0 8px rgba(82,242,197,.35); }
.pm-bar-cup    { background: linear-gradient(90deg, var(--color-purple-brand), #d28bff); box-shadow: 0 0 10px rgba(181,89,243,.35); }

/* ACCOUNT */
.pm-account {
  border-top: 1px solid var(--color-line);
  padding-top: 14px;
  display: flex;
  flex-direction: column;
  gap: 9px;
}
.pm-acc-row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 12px;
  font-size: 11px;
}
.pm-acc-key { color: var(--color-ink-3); text-transform: uppercase; letter-spacing: .1em; font-size: 9px; flex-shrink: 0; }
.pm-acc-val { color: var(--color-ink); text-align: right; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

/* mobile */
@media (max-width: 480px) {
  .pm-card { right: 8px; left: 8px; width: auto; }
  .pm-stats { grid-template-columns: repeat(2, minmax(0,1fr)); }
}
</style>
