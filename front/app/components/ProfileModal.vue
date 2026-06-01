<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { UserProfile } from '~/types/user'

interface Props {
  open: boolean
  originRect?: DOMRect | null
  profile?: UserProfile | null
}
const props = defineProps<Props>()
const emit = defineEmits<{ (e: 'close'): void }>()

const user = useStrapiUser() as unknown as { value: UserProfile | null }
const currentUser = computed(() => user.value)
const u = computed(() => props.profile ?? currentUser.value)
const strapiBase = (useRuntimeConfig().public as any)?.strapi?.url ?? 'http://localhost:1337'
const token = useStrapiToken()
const { fetchUser } = useStrapiAuth()
const isOwnProfile = computed(() => !props.profile || String(props.profile.id) === String(currentUser.value?.id ?? ''))
const canEditProfile = computed(() => isOwnProfile.value)

const displayName = computed(() => u.value?.displayName || u.value?.username || 'Игрок')
const username    = computed(() => u.value?.username ?? '—')
const email       = computed(() => u.value?.email || '—')
const initial     = computed(() => (displayName.value[0] ?? '?').toUpperCase())
const isPm        = computed(() => u.value?.teamRole === 'pm')
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
const badgesCount      = computed(() => u.value?.earnedBadges?.length ?? u.value?.badgesCount ?? 0)

const fmt = (n: number) => n.toLocaleString('ru-RU').replace(/,/g, ' ')

interface ProfileHeaderSettings {
  color: string
  image: string
  imageX: number
  imageY: number
  imageSize: number
}

const defaultHeaderSettings: ProfileHeaderSettings = {
  color: '#d9fbff',
  image: '/voxel/dino.png',
  imageX: 82,
  imageY: 50,
  imageSize: 104,
}

const headerColorPresets = ['#d9fbff', '#f6e9ff', '#e8fff6', '#fff5d9', '#202335', '#111827']

// Profile pictures are unlocked by earning badges. Everyone starts with the
// starter picture; every other picture is the reward of a specific badge.
const STARTER_IMAGE = '/voxel/dino.png'

interface HeaderImageOption {
  src: string
  label: string
  unlocked: boolean
  badgeLabel?: string
}

// All badges that reward a profile picture (label, rewardImage) — fetched from
// Strapi so the catalog stays in sync with the achievements.
const rewardBadges = ref<{ label: string; rewardImage: string }[]>([])

// Pictures the user has unlocked = starter + reward pictures of earned badges.
// Matched by rewardImage (stable), not numeric id (draft/published differ).
// The PM gets every picture unlocked — they don't earn badges themselves.
const unlockedImages = computed(() => {
  const s = new Set<string>(['', STARTER_IMAGE])
  if (isPm.value) {
    for (const b of rewardBadges.value) s.add(b.rewardImage)
    return s
  }
  for (const b of u.value?.earnedBadges ?? []) {
    if (typeof b.rewardImage === 'string' && b.rewardImage) s.add(b.rewardImage)
  }
  return s
})

const loadRewardBadges = async () => {
  try {
    const res = await $fetch<{ data?: any[] }>(`${strapiBase}/api/badges`, {
      params: { 'fields[0]': 'label', 'fields[1]': 'rewardImage', 'sort[0]': 'order:asc' },
    })
    rewardBadges.value = (res?.data ?? [])
      .filter((b: any) => typeof b.rewardImage === 'string' && b.rewardImage)
      .map((b: any) => ({ label: b.label, rewardImage: b.rewardImage }))
  } catch { /* keep empty — only starter/none available */ }
}

const headerImages = computed<HeaderImageOption[]>(() => [
  { src: '', label: 'Нет', unlocked: true },
  { src: STARTER_IMAGE, label: 'Стартовая', unlocked: true },
  ...rewardBadges.value.map(b => ({
    src: b.rewardImage,
    label: b.label,
    unlocked: unlockedImages.value.has(b.rewardImage),
    badgeLabel: b.label,
  })),
])
const isImageUnlocked = (src: string) => unlockedImages.value.has(src)

const profileHeader = ref<ProfileHeaderSettings>({ ...defaultHeaderSettings })
const headerRef = ref<HTMLElement | null>(null)

// Customizer can be collapsed so the profile card stays compact by default.
const customizerOpen = ref(false)
const customizerStorageKey = computed(() => `fr-profile-customizer-open:${u.value?.id ?? u.value?.username ?? 'guest'}`)
const loadCustomizerOpen = () => {
  if (!import.meta.client) return
  customizerOpen.value = window.localStorage.getItem(customizerStorageKey.value) === '1'
}
const toggleCustomizer = () => {
  customizerOpen.value = !customizerOpen.value
  if (import.meta.client) {
    window.localStorage.setItem(customizerStorageKey.value, customizerOpen.value ? '1' : '0')
  }
}

// GSAP-driven expand/collapse for the customizer. Height tweens to/from the
// content's natural size; the inner block slides + fades for a softer reveal.
const onCustomizerEnter = async (el: Element, done: () => void) => {
  const gsap = await loadGsap()
  const inner = el.querySelector('.pm-customizer-inner')
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (reduced) {
    gsap.set(el, { height: 'auto', opacity: 1 })
    if (inner) gsap.set(inner, { y: 0, autoAlpha: 1 })
    done()
    return
  }
  gsap.set(el, { overflow: 'hidden' })
  gsap.fromTo(
    el,
    { height: 0, opacity: 0, marginTop: 0 },
    {
      height: 'auto',
      opacity: 1,
      marginTop: 12,
      duration: 0.5,
      ease: 'power3.out',
      clearProps: 'height,overflow',
      onComplete: done,
    },
  )
  if (inner) {
    gsap.fromTo(
      inner,
      { y: -12, autoAlpha: 0 },
      { y: 0, autoAlpha: 1, duration: 0.55, ease: 'power3.out', delay: 0.05 },
    )
  }
}

const onCustomizerLeave = async (el: Element, done: () => void) => {
  const gsap = await loadGsap()
  const inner = el.querySelector('.pm-customizer-inner')
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (reduced) { done(); return }
  gsap.set(el, { overflow: 'hidden' })
  const tl = gsap.timeline({ onComplete: done })
  if (inner) tl.to(inner, { y: -8, autoAlpha: 0, duration: 0.22, ease: 'power2.in' }, 0)
  tl.to(el, { height: 0, opacity: 0, marginTop: 0, duration: 0.38, ease: 'power2.inOut' }, 0.04)
}
const headerSaveState = ref<'idle' | 'saved'>('idle')
const headerSaving = ref(false)
const draggingHeaderArt = ref(false)
const headerDragOffset = ref<{ x: number, y: number } | null>(null)
const profileHeaderStorageKey = computed(() => `fr-profile-header:${u.value?.id ?? u.value?.username ?? 'guest'}`)
const clampPercent = (value: unknown, fallback: number) => Math.min(100, Math.max(0, Number(value) || fallback))
const clampSize = (value: unknown, fallback: number) => Math.min(180, Math.max(54, Number(value) || fallback))

// Coerce any stored/loaded shape into valid header settings, filling gaps with defaults.
const normalizeHeaderSettings = (parsed: any): ProfileHeaderSettings => ({
  color: typeof parsed?.color === 'string' && /^#[0-9a-f]{6}$/i.test(parsed.color) ? parsed.color : defaultHeaderSettings.color,
  image: typeof parsed?.image === 'string' ? parsed.image : defaultHeaderSettings.image,
  imageX: clampPercent(parsed?.imageX, defaultHeaderSettings.imageX),
  imageY: clampPercent(parsed?.imageY, defaultHeaderSettings.imageY),
  imageSize: clampSize(parsed?.imageSize, defaultHeaderSettings.imageSize),
})

const loadProfileHeader = () => {
  // Prefer the server-persisted header (DB). Fall back to localStorage, then defaults.
  const fromDb = u.value?.profileHeader
  if (fromDb && typeof fromDb === 'object') {
    profileHeader.value = normalizeHeaderSettings(fromDb)
    headerSaveState.value = 'idle'
    return
  }
  if (!isOwnProfile.value) {
    profileHeader.value = { ...defaultHeaderSettings }
    headerSaveState.value = 'idle'
    return
  }
  if (!import.meta.client) {
    profileHeader.value = { ...defaultHeaderSettings }
    return
  }
  try {
    const raw = window.localStorage.getItem(profileHeaderStorageKey.value)
    profileHeader.value = normalizeHeaderSettings(raw ? JSON.parse(raw) : {})
  } catch {
    profileHeader.value = { ...defaultHeaderSettings }
  }
  headerSaveState.value = 'idle'
}

const saveProfileHeader = async () => {
  if (!isOwnProfile.value) return
  if (headerSaving.value) return
  // Optimistic local cache so the look survives an offline reload too.
  if (import.meta.client) {
    window.localStorage.setItem(profileHeaderStorageKey.value, JSON.stringify(profileHeader.value))
  }
  if (!token.value) { headerSaveState.value = 'saved'; return }

  headerSaving.value = true
  try {
    await $fetch(`${strapiBase}/api/users/me/profile-header`, {
      method: 'POST',
      body: { ...profileHeader.value },
      headers: { Authorization: `Bearer ${token.value}` },
    })
    // Refresh /me so profileHeader is the source of truth on the next open.
    await fetchUser()
  } catch {
    // Network/permission failure — keep the localStorage copy as a fallback.
  } finally {
    headerSaving.value = false
    headerSaveState.value = 'saved'
  }
}

const setHeaderImage = (src: string) => {
  // Locked pictures can't be selected — they're earned via badges.
  if (!isImageUnlocked(src)) return
  profileHeader.value.image = src
  headerSaveState.value = 'idle'
}
const setHeaderColor = (color: string) => { profileHeader.value.color = color; headerSaveState.value = 'idle' }
const resetProfileHeader = async () => {
  profileHeader.value = { ...defaultHeaderSettings }
  await saveProfileHeader()
}

const headerIsDark = computed(() => {
  const hex = profileHeader.value.color.replace('#', '')
  const r = Number.parseInt(hex.slice(0, 2), 16)
  const g = Number.parseInt(hex.slice(2, 4), 16)
  const b = Number.parseInt(hex.slice(4, 6), 16)
  return (r * 0.299 + g * 0.587 + b * 0.114) < 125
})
const profileHeaderStyle = computed(() => ({
  '--pm-header-ink': headerIsDark.value ? '#ffffff' : '#11131c',
  '--pm-header-muted': headerIsDark.value ? 'rgba(255,255,255,.72)' : 'rgba(17,19,28,.56)',
  background:
    `${headerIsDark.value ? 'linear-gradient(120deg, rgba(255,255,255,.08), rgba(255,255,255,.02))' : 'linear-gradient(120deg, rgba(255,255,255,.72), rgba(255,255,255,.18))'}, ${profileHeader.value.color}`,
}))
const profileHeaderArtStyle = computed(() => ({
  left: `${profileHeader.value.imageX}%`,
  top: `${profileHeader.value.imageY}%`,
  width: `${profileHeader.value.imageSize}px`,
  height: `${profileHeader.value.imageSize}px`,
}))

const moveHeaderArtToPointer = (e: PointerEvent) => {
  if (!headerRef.value) return
  const rect = headerRef.value.getBoundingClientRect()
  const offset = headerDragOffset.value ?? { x: 0, y: 0 }
  const x = ((e.clientX - rect.left - offset.x) / rect.width) * 100
  const y = ((e.clientY - rect.top - offset.y) / rect.height) * 100
  profileHeader.value.imageX = Math.round(clampPercent(x, profileHeader.value.imageX))
  profileHeader.value.imageY = Math.round(clampPercent(y, profileHeader.value.imageY))
  headerSaveState.value = 'idle'
}

const onHeaderArtPointerDown = (e: PointerEvent) => {
  if (!profileHeader.value.image) return
  const target = e.currentTarget as HTMLElement
  const targetRect = target.getBoundingClientRect()
  headerDragOffset.value = {
    x: e.clientX - (targetRect.left + targetRect.width / 2),
    y: e.clientY - (targetRect.top + targetRect.height / 2),
  }
  draggingHeaderArt.value = true
  target.setPointerCapture?.(e.pointerId)
  e.preventDefault()
  moveHeaderArtToPointer(e)
}
const onHeaderArtPointerMove = (e: PointerEvent) => {
  if (!draggingHeaderArt.value) return
  moveHeaderArtToPointer(e)
}
const onHeaderArtPointerUp = (e: PointerEvent) => {
  draggingHeaderArt.value = false
  headerDragOffset.value = null
  ;(e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId)
}

// ── avatar upload ──
const { avatarUrl, upload: uploadAvatar } = useUserAvatar()
const fileInput = ref<HTMLInputElement | null>(null)
const avatarUploading = ref(false)
const avatarError = ref<string | null>(null)
const viewedAvatarUrl = computed(() => props.profile?.avatar?.url ?? avatarUrl.value)

const pickAvatar = () => {
  if (!canEditProfile.value) return
  if (avatarUploading.value) return
  fileInput.value?.click()
}
const onAvatarChange = async (e: Event) => {
  if (!canEditProfile.value) return
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = '' // let the user re-pick the same file later
  if (!file) return
  if (!file.type.startsWith('image/')) { avatarError.value = 'Нужен файл изображения'; return }
  if (file.size > 5 * 1024 * 1024) { avatarError.value = 'Файл больше 5 МБ'; return }
  avatarError.value = null
  avatarUploading.value = true
  try {
    await uploadAvatar(file)
  } catch {
    avatarError.value = 'Не удалось загрузить'
  } finally {
    avatarUploading.value = false
  }
}

// ── PM-only: invite link for adding participants to the team ──
const invite = useTeamInvite()
const inviteUrl = ref<string | null>(null)
const inviteState = ref<'idle' | 'loading' | 'copied' | 'error'>('idle')

const inviteLabel = computed(() => {
  switch (inviteState.value) {
    case 'loading': return 'Создаём ссылку…'
    case 'copied':  return 'Ссылка скопирована'
    case 'error':   return 'Не удалось создать ссылку'
    default:        return 'Скопировать ссылку-приглашение'
  }
})

const createInviteLink = async () => {
  if (inviteState.value === 'loading') return
  inviteState.value = 'loading'
  try {
    const link = await invite.createInvite()
    if (!link) throw new Error('no link')
    inviteUrl.value = link.url
    try {
      await navigator.clipboard.writeText(link.url)
      inviteState.value = 'copied'
    } catch {
      // Clipboard blocked (e.g. http / permissions) — still surface the URL.
      inviteState.value = 'idle'
    }
  } catch {
    inviteState.value = 'error'
  }
}

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
      loadProfileHeader()
      loadCustomizerOpen()
      loadRewardBadges()
      document.addEventListener('keydown', onEsc)
      await nextTick()
      animateIn()
    } else {
      document.removeEventListener('keydown', onEsc)
    }
  },
)

watch([profileHeaderStorageKey, () => props.profile], loadProfileHeader)
onMounted(async () => {
  loadProfileHeader()
  loadCustomizerOpen()
  loadRewardBadges()
})

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
        <div ref="headerRef" class="pm-header pm-stagger" :style="profileHeaderStyle">
          <img
            v-if="profileHeader.image"
            class="pm-header-art"
            :class="{ 'is-dragging': draggingHeaderArt }"
            :src="profileHeader.image"
            alt=""
            aria-hidden="true"
            :style="profileHeaderArtStyle"
            @pointerdown="onHeaderArtPointerDown"
            @pointermove="onHeaderArtPointerMove"
            @pointerup="onHeaderArtPointerUp"
            @pointercancel="onHeaderArtPointerUp"
            @lostpointercapture="onHeaderArtPointerUp"
          />
          <div class="pm-avatar-wrap">
            <div class="pm-avatar-pulse" />
            <button
              type="button"
              class="pm-avatar"
              :class="{ 'has-img': !!viewedAvatarUrl, 'is-readonly': !canEditProfile }"
              :disabled="avatarUploading || !canEditProfile"
              :aria-label="canEditProfile ? (viewedAvatarUrl ? 'Сменить аватар' : 'Загрузить аватар') : 'Аватар профиля'"
              @click="pickAvatar"
            >
              <img v-if="viewedAvatarUrl" :src="viewedAvatarUrl" alt="" class="pm-avatar-img" />
              <span v-else class="font-pix">{{ initial }}</span>
              <span v-if="canEditProfile" class="pm-avatar-edit" aria-hidden="true">
                <svg v-if="!avatarUploading" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                </svg>
                <span v-else class="pm-avatar-spin" />
              </span>
            </button>
            <input
              ref="fileInput"
              type="file"
              accept="image/*"
              class="hidden"
              @change="onAvatarChange"
            />
          </div>
          <div class="pm-id">
            <div class="pm-name font-pix">{{ displayName }}</div>
            <div v-if="avatarError" class="pm-avatar-err font-mono">{{ avatarError }}</div>
            <div v-else class="pm-team font-mono">{{ teamLine }}</div>
          </div>
          <div class="pm-level font-pix" aria-label="Уровень">
            <span class="pm-level-label">LVL</span>
            <span class="pm-level-num">{{ lvl }}</span>
          </div>
        </div>

        <!-- HEADER CUSTOMIZER -->
        <div v-if="canEditProfile" class="pm-customizer pm-stagger" :class="{ 'is-collapsed': !customizerOpen }" aria-label="Настройка шапки профиля">
          <button
            type="button"
            class="pm-customizer-toggle font-mono"
            :aria-expanded="customizerOpen"
            @click="toggleCustomizer"
          >
            <span>Кастомизация профиля</span>
            <svg
              class="pm-customizer-chevron"
              :class="{ 'is-open': customizerOpen }"
              viewBox="0 0 24 24" width="16" height="16"
              fill="none" stroke="currentColor" stroke-width="2"
              stroke-linecap="round" stroke-linejoin="round"
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>

          <Transition :css="false" @enter="onCustomizerEnter" @leave="onCustomizerLeave">
          <div v-if="customizerOpen" class="pm-customizer-body">
          <div class="pm-customizer-inner">
          <div class="pm-custom-row">
            <div class="pm-custom-label font-mono">Фон</div>
            <div class="pm-color-tools">
              <input
                v-model="profileHeader.color"
                class="pm-color-input"
                type="color"
                aria-label="Цвет фона шапки профиля"
                @input="headerSaveState = 'idle'"
              />
              <button
                v-for="color in headerColorPresets"
                :key="color"
                type="button"
                class="pm-color-swatch"
                :class="{ 'is-active': profileHeader.color.toLowerCase() === color.toLowerCase() }"
                :style="{ backgroundColor: color }"
                :aria-label="`Выбрать цвет ${color}`"
                @click="setHeaderColor(color)"
              />
            </div>
          </div>

          <div class="pm-custom-row">
            <div class="pm-custom-label font-mono">Картинка</div>
            <div class="pm-image-picker">
              <button
                v-for="img in headerImages"
                :key="img.src || 'none'"
                type="button"
                class="pm-image-choice"
                :class="{ 'is-active': profileHeader.image === img.src, 'is-locked': !img.unlocked }"
                :disabled="!img.unlocked"
                :title="img.unlocked ? img.label : `Открой бейдж «${img.badgeLabel ?? img.label}»`"
                :aria-label="img.unlocked ? `Выбрать ${img.label}` : `Заблокировано — открой бейдж ${img.badgeLabel ?? img.label}`"
                @click="setHeaderImage(img.src)"
              >
                <span v-if="!img.src" class="pm-image-none font-mono">×</span>
                <img v-else :src="img.src" :alt="img.label" />
                <span v-if="!img.unlocked" class="pm-image-lock" aria-hidden="true"><UIcon name="i-lucide-lock" /></span>
              </button>
            </div>
          </div>
          <p class="pm-image-hint font-mono">Картинки открываются за бейджи в разделе «Достижения».</p>

          <div class="pm-custom-sliders">
            <label class="pm-slider font-mono">
              <span>SIZE</span>
              <input
                v-model.number="profileHeader.imageSize"
                type="range"
                min="54"
                max="180"
                :disabled="!profileHeader.image"
                @input="headerSaveState = 'idle'"
              />
            </label>
          </div>

          <div class="pm-custom-actions">
            <button type="button" class="pm-save-header font-mono" :disabled="headerSaving" @click="saveProfileHeader">
              {{ headerSaving ? 'Сохраняем…' : headerSaveState === 'saved' ? 'Сохранено' : 'Сохранить фон' }}
            </button>
            <button type="button" class="pm-reset-header font-mono" :disabled="headerSaving" @click="resetProfileHeader">
              Сбросить
            </button>
          </div>
          </div>
          </div>
          </Transition>
        </div>

        <!-- STAT CHIPS (player-only: XP / streak / challenges / badges) -->
        <div v-if="!isPm" class="pm-stats">
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
          <div v-if="!isPm" class="pm-bar-block pm-stagger">
            <div class="pm-bar-head">
              <span class="font-mono">Опыт до {{ lvl + 1 }} уровня</span>
              <span class="font-mono"><b class="text-ink">{{ fmt(xp) }}</b> / {{ fmt(xpTotal) }} XP</span>
            </div>
            <div class="pm-bar"><i class="pm-bar-xp" :style="{ width: xpPercent + '%' }" /></div>
          </div>
          <div v-if="!isPm" class="pm-bar-block pm-stagger">
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

        <!-- INVITE (PM only) -->
        <div v-if="isPm && canEditProfile" class="pm-invite pm-stagger">
          <div class="pm-invite-head font-mono">Пригласить участника</div>
          <p class="pm-invite-note font-mono">
            Скопируй ссылку и передай участнику. Она действует 30 минут — кто
            войдёт по ней, попадёт в команду «{{ u?.team || '—' }}».
          </p>
          <button
            type="button"
            class="pm-invite-btn font-mono"
            :class="{ 'is-copied': inviteState === 'copied', 'is-error': inviteState === 'error' }"
            :disabled="inviteState === 'loading'"
            @click="createInviteLink"
          >
            {{ inviteLabel }}
          </button>
          <div v-if="inviteUrl" class="pm-invite-url font-mono" :title="inviteUrl">
            {{ inviteUrl }}
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
  position: relative;
  display: grid;
  grid-template-columns: 62px 1fr auto;
  gap: 14px;
  align-items: center;
  margin: -22px -22px 18px;
  padding: 22px 44px 18px 22px;
  border-radius: 18px 18px 0 0;
  border-bottom: 1px solid var(--color-line);
  overflow: hidden;
}
.pm-header > *:not(.pm-header-art) {
  position: relative;
  z-index: 1;
}
.pm-header-art {
  position: absolute;
  z-index: 0;
  object-fit: contain;
  transform: translate(-50%, -50%);
  will-change: left, top, transform;
  opacity: .3;
  filter: drop-shadow(0 12px 18px rgba(0, 0, 0, .28));
  user-select: none;
  touch-action: none;
  cursor: grab;
}
.pm-header-art.is-dragging {
  cursor: grabbing;
  opacity: .42;
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
  color: #11131c;
  font-size: 28px;
  padding: 0;
  border: 0;
  overflow: hidden;
  cursor: pointer;
  background: #fff;
  box-shadow: 0 0 0 1px var(--color-line-strong), 0 10px 24px -8px rgba(0,0,0,0.25);
  transition: transform 200ms cubic-bezier(0.34,1.56,0.64,1);
}
/* once an avatar image is set, restore the brand gradient frame behind it */
.pm-avatar.has-img {
  color: #fff;
  background: linear-gradient(135deg, var(--color-purple-brand), var(--color-cyan-brand));
  box-shadow: 0 0 0 1px var(--color-line-strong), 0 10px 24px -8px rgba(181,89,243,0.45);
}
.pm-avatar:hover:not(:disabled) { transform: scale(1.04); }
.pm-avatar:disabled { cursor: progress; }
.pm-avatar.is-readonly:disabled { cursor: default; }
.pm-avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
/* edit affordance — a small badge bottom-right, brightens on hover */
.pm-avatar-edit {
  position: absolute;
  right: 0;
  bottom: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 8px 0 12px 0;
  color: #fff;
  background: rgba(11, 11, 14, 0.55);
  backdrop-filter: blur(2px);
  opacity: 0.85;
  transition: opacity 150ms, background 150ms;
}
.pm-avatar:hover:not(:disabled) .pm-avatar-edit { opacity: 1; background: var(--color-cyan-brand); color: var(--color-btn-ink); }
.pm-avatar-spin {
  width: 13px;
  height: 13px;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.4);
  border-top-color: #fff;
  animation: pmSpin 0.7s linear infinite;
}
@keyframes pmSpin { to { transform: rotate(360deg); } }
.pm-avatar-err {
  font-size: 10px;
  letter-spacing: .04em;
  color: #ff7575;
  margin-top: 5px;
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
  color: var(--pm-header-ink, var(--color-ink));
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.pm-sub  { font-size: 11px; letter-spacing: .06em; color: var(--pm-header-muted, var(--color-ink-3)); margin-top: 3px; }
.pm-team { font-size: 10px; letter-spacing: .1em; text-transform: uppercase; color: var(--pm-header-muted, var(--color-ink-3)); margin-top: 5px; }

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

/* HEADER CUSTOMIZER */
.pm-customizer {
  border-bottom: 1px solid var(--color-line);
  padding-bottom: 16px;
  margin-bottom: 18px;
}
.pm-customizer.is-collapsed {
  padding-bottom: 14px;
}
.pm-customizer-toggle {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 4px 0;
  background: transparent;
  border: 0;
  cursor: pointer;
  color: var(--color-ink-3);
  font-size: 10px;
  letter-spacing: .12em;
  text-transform: uppercase;
  transition: color 150ms;
}
.pm-customizer-toggle:hover { color: var(--color-ink); }
.pm-customizer-chevron {
  flex-shrink: 0;
  transition: transform 200ms ease;
}
.pm-customizer-chevron.is-open { transform: rotate(180deg); }
@media (prefers-reduced-motion: reduce) {
  .pm-customizer-chevron { transition: none; }
}

/* Motion is driven by GSAP (onCustomizerEnter/Leave). These rules only keep
   the collapsing content clipped while its height tweens. */
.pm-customizer-body {
  overflow: hidden;
  margin-top: 12px;
}
.pm-customizer-inner { will-change: transform, opacity; }
.pm-custom-row {
  display: grid;
  grid-template-columns: 70px minmax(0, 1fr);
  gap: 10px;
  align-items: center;
  margin-bottom: 10px;
}
.pm-custom-label {
  color: var(--color-ink-3);
  font-size: 9px;
  letter-spacing: .12em;
  text-transform: uppercase;
}
.pm-color-tools {
  display: flex;
  align-items: center;
  gap: 7px;
  min-width: 0;
  flex-wrap: wrap;
}
.pm-color-input {
  width: 34px;
  height: 34px;
  padding: 0;
  border: 1px solid var(--color-line);
  border-radius: 9px;
  overflow: hidden;
  background: transparent;
  cursor: pointer;
}
.pm-color-input::-webkit-color-swatch-wrapper { padding: 0; }
.pm-color-input::-webkit-color-swatch { border: 0; }
.pm-color-swatch {
  width: 24px;
  height: 24px;
  border-radius: 8px;
  border: 1px solid var(--color-line-strong);
  cursor: pointer;
  box-shadow: 0 0 0 0 rgba(24,239,242,0);
  transition: transform 150ms, box-shadow 150ms;
}
.pm-color-swatch:hover,
.pm-color-swatch.is-active {
  transform: translateY(-1px);
  box-shadow: 0 0 0 2px rgba(24,239,242,.24);
}
.pm-image-picker {
  display: grid;
  grid-template-columns: repeat(6, 34px);
  gap: 7px;
}
.pm-image-choice {
  position: relative;
  width: 34px;
  height: 34px;
  border-radius: 9px;
  border: 1px solid var(--color-line);
  background: var(--color-bg-3);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: border-color 150ms, transform 150ms, background 150ms;
}
.pm-image-choice:hover:not(:disabled),
.pm-image-choice.is-active {
  border-color: var(--color-cyan-brand);
  background: rgba(24,239,242,.08);
  transform: translateY(-1px);
}
.pm-image-choice.is-locked {
  cursor: not-allowed;
  border-style: dashed;
}
.pm-image-choice.is-locked img { filter: grayscale(1); opacity: 0.35; }
.pm-image-lock {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  background: rgba(11, 11, 14, 0.35);
  border-radius: 8px;
}
.pm-image-hint {
  margin: 8px 0 0;
  font-size: 9px;
  letter-spacing: 0.06em;
  color: var(--color-ink-3);
}
.pm-image-choice img {
  width: 25px;
  height: 25px;
  object-fit: contain;
}
.pm-image-none {
  color: var(--color-ink-3);
  font-size: 14px;
  line-height: 1;
}
.pm-custom-sliders {
  display: block;
  margin-top: 12px;
}
.pm-slider {
  display: flex;
  flex-direction: column;
  gap: 6px;
  color: var(--color-ink-3);
  font-size: 9px;
  letter-spacing: .12em;
}
.pm-slider input {
  width: 100%;
  accent-color: var(--color-cyan-brand);
}
.pm-slider input:disabled {
  opacity: .45;
}
.pm-custom-actions {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 8px;
  margin-top: 10px;
}
.pm-save-header,
.pm-reset-header {
  width: 100%;
  padding: 8px 10px;
  border-radius: 9px;
  font-size: 9px;
  letter-spacing: .1em;
  text-transform: uppercase;
  cursor: pointer;
  transition: color 150ms, border-color 150ms, background 150ms;
}
.pm-save-header {
  border: 1px solid var(--color-cyan-brand);
  background: rgba(24,239,242,.08);
  color: var(--color-cyan-brand);
}
.pm-save-header:hover {
  background: rgba(24,239,242,.16);
}
.pm-reset-header {
  border: 1px solid var(--color-line);
  background: transparent;
  color: var(--color-ink-3);
}
.pm-reset-header:hover {
  color: var(--color-ink);
  border-color: var(--color-line-strong);
  background: var(--color-bg-3);
}
.pm-save-header:disabled,
.pm-reset-header:disabled {
  opacity: .6;
  cursor: progress;
}

/* STATS */
.pm-stats {
  display: grid;
  grid-template-columns: repeat(4, minmax(0,1fr));
  gap: 8px;
  margin-bottom: 18px;
}
.pm-stat {
  min-width: 0;
  padding: 12px 8px;
  background: var(--color-bg-3);
  border: 1px solid var(--color-line);
  border-radius: 12px;
  overflow: hidden;
  transition: transform 180ms ease, border-color 180ms ease;
}
.pm-stat:hover { transform: translateY(-2px); border-color: var(--color-line-strong); }
.pm-stat-num { font-size: 22px; line-height: 1; }
.pm-stat-cap {
  font-size: 9px;
  letter-spacing: .04em;
  line-height: 1.2;
  text-transform: uppercase;
  color: var(--color-ink-3);
  margin-top: 5px;
  overflow-wrap: anywhere;
}

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

/* INVITE (PM only) */
.pm-invite {
  border-top: 1px solid var(--color-line);
  margin-top: 16px;
  padding-top: 16px;
}
.pm-invite-head {
  font-size: 10px;
  letter-spacing: .12em;
  text-transform: uppercase;
  color: var(--color-ink-3);
  margin-bottom: 8px;
}
.pm-invite-note {
  font-size: 11px;
  line-height: 1.5;
  color: var(--color-ink-2);
  margin: 0 0 12px;
}
.pm-invite-btn {
  width: 100%;
  padding: 11px 12px;
  border-radius: 10px;
  border: 1px solid var(--color-cyan-brand);
  background: rgba(24, 239, 242, 0.08);
  color: var(--color-cyan-brand);
  font-size: 11px;
  letter-spacing: .08em;
  text-transform: uppercase;
  cursor: pointer;
  transition: background 150ms, border-color 150ms, color 150ms, opacity 150ms;
}
.pm-invite-btn:hover:not(:disabled) { background: rgba(24, 239, 242, 0.16); }
.pm-invite-btn:disabled { opacity: .6; cursor: progress; }
.pm-invite-btn.is-copied {
  border-color: var(--color-mint-brand);
  background: rgba(82, 242, 197, 0.12);
  color: var(--color-mint-brand);
}
.pm-invite-btn.is-error {
  border-color: #ff7575;
  background: rgba(255, 117, 117, 0.1);
  color: #ff7575;
}
.pm-invite-url {
  margin-top: 10px;
  padding: 8px 10px;
  border-radius: 8px;
  background: var(--color-bg-3);
  border: 1px solid var(--color-line);
  color: var(--color-ink-2);
  font-size: 10px;
  word-break: break-all;
}

/* mobile */
@media (max-width: 480px) {
  .pm-card { right: 8px; left: 8px; width: auto; }
  .pm-header { grid-template-columns: 56px 1fr auto; gap: 10px; padding-right: 36px; }
  .pm-avatar-wrap,
  .pm-avatar { width: 56px; height: 56px; }
  .pm-name { font-size: 19px; }
  .pm-custom-row { grid-template-columns: 1fr; gap: 7px; }
  .pm-image-picker { grid-template-columns: repeat(5, 34px); }
  .pm-custom-actions { grid-template-columns: 1fr; }
  .pm-stats { grid-template-columns: repeat(2, minmax(0,1fr)); }
}
</style>
