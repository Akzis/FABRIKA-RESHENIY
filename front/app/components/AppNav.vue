<script setup lang="ts">
import { computed, ref } from 'vue'

const user = useStrapiUser()
const { logout } = useStrapiAuth()

const allLinks = [
  { href: '#how', label: 'Как это работает' },
  { href: '#tasks', label: 'Задания' },
  { href: '#shop', label: 'Магазин' },
  { href: '#leaderboard', label: 'Рейтинг' },
  { href: '#roles', label: 'Команды' },
]

// PMs don't see the player sections (mechanics, levels, progress), so the
// quick-nav must not link to anchors that no longer render on the page.
const isPm = computed(() => (user.value as any)?.teamRole === 'pm')
const hasTeam = computed(() => !!(user.value as any)?.team)
const pmHidden = new Set(['#how', '#tasks', '#shop'])
const links = computed(() => {
  let ls = isPm.value ? allLinks.filter(l => !pmHidden.has(l.href)) : allLinks
  // PMs get "Команда" + "Проверка" entries for their management views.
  if (isPm.value && hasTeam.value) {
    ls = [{ href: '#team', label: 'Команда' }, { href: '#review', label: 'Проверка' }, { href: '#deliveries', label: 'Доставки' }, ...ls]
  }
  // Tasks section is hidden for participants without a team.
  if (!isPm.value && !hasTeam.value) ls = ls.filter(l => l.href !== '#tasks')
  return ls
})

const displayName = computed(() => {
  const u = user.value as any
  return u?.username ?? u?.email ?? 'игрок'
})

const initial = computed(() => (displayName.value[0] ?? '?').toUpperCase())

const { avatarUrl } = useUserAvatar()

// ── гайд-тур по платформе (driver.js) ──────────────────────────────────
const { startTour } = useTour()

const onLogout = async () => {
  await logout()
}

// ── profile mini-app ───────────────────────────────────────────────────
const profileOpen = ref(false)
const profileTriggerRef = ref<HTMLButtonElement | null>(null)
const originRect = ref<DOMRect | null>(null)

const openProfile = () => {
  if (profileTriggerRef.value) {
    originRect.value = profileTriggerRef.value.getBoundingClientRect()
  }
  profileOpen.value = true
}
const closeProfile = () => {
  profileOpen.value = false
}
</script>

<template>
  <nav class="sticky top-0 z-50 backdrop-blur-md border-b border-line" style="background: var(--color-nav-bg)">
    <div class="max-w-[1320px] mx-auto px-4 sm:px-8 flex items-center justify-between h-[64px] sm:h-[72px] gap-3 sm:gap-8">
      <a href="#" class="flex items-center gap-3">
        <BrandLogo light="/voxel/logo.png" dark="/voxel/logowhite.png" img-class="logo-mark h-7 [image-rendering:pixelated]" />
        <span class="hidden xl:inline font-mono text-[11px] tracking-[0.08em] uppercase text-ink-3 border-l border-line-strong pl-3 whitespace-nowrap">
          <BrandLogo light="/voxel/school21.png" dark="/voxel/school21(white).png" alt="Школа 21" img-class="logo-mark h-7 [image-rendering:pixelated]" />
        </span>
      </a>

      <div data-tour="nav" class="hidden md:flex gap-7 items-center text-sm text-ink-2">
        <template v-for="l in links" :key="l.href">
          <button
            v-if="l.href === '#how'"
            type="button"
            class="py-2 transition-colors duration-150 hover:text-cyan-brand cursor-pointer bg-transparent border-0 text-inherit"
            @click="startTour"
          >
            {{ l.label }}
          </button>
          <a v-else :href="l.href" class="py-2 transition-colors duration-150 hover:text-cyan-brand">
            {{ l.label }}
          </a>
        </template>
      </div>

      <div class="flex items-center gap-2.5">
        <ThemeToggle />
        <button
          ref="profileTriggerRef"
          type="button"
          class="profile-trigger hidden sm:flex items-center gap-2.5 pl-3 border-l border-line-strong"
          :aria-label="`Открыть профиль ${displayName}`"
          @click="openProfile"
        >
          <div class="profile-avatar w-9 h-9 rounded-[10px] overflow-hidden flex items-center justify-center font-pix text-base" :class="avatarUrl ? 'text-white' : 'bg-white text-[#11131c]'" :style="avatarUrl ? 'background: linear-gradient(135deg, var(--color-purple-brand), var(--color-cyan-brand))' : undefined">
            <img v-if="avatarUrl" :src="avatarUrl" alt="" class="w-full h-full object-cover" />
            <template v-else>{{ initial }}</template>
          </div>
          <span class="profile-name font-mono text-[12px] tracking-[0.04em] text-ink-2 max-w-[140px] truncate">{{ displayName }}</span>
        </button>
        <BaseButton variant="ghost" @click="onLogout">Выйти</BaseButton>
      </div>
    </div>

    <ProfileModal :open="profileOpen" :origin-rect="originRect" @close="closeProfile" />
  </nav>
</template>

<style scoped>
.profile-trigger {
  background: transparent;
  border-radius: 12px;
  padding: 4px 8px 4px 12px;
  margin-right: -4px;
  cursor: pointer;
  transition: background-color 180ms ease, transform 180ms ease;
}
.profile-trigger:hover {
  background: var(--color-bg-3);
}
.profile-trigger:hover .profile-name {
  color: var(--color-ink);
}
.profile-trigger:active {
  transform: scale(0.97);
}
.profile-avatar {
  transition: transform 220ms cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 220ms ease;
}
.profile-trigger:hover .profile-avatar {
  transform: scale(1.08) rotate(-4deg);
  box-shadow: 0 0 0 2px rgba(24, 239, 242, 0.35), 0 6px 18px -6px rgba(181, 89, 243, 0.5);
}
.profile-name {
  transition: color 180ms ease;
}
</style>
