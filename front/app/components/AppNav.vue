<script setup lang="ts">
import { computed, ref } from 'vue'

const user = useStrapiUser()
const { logout } = useStrapiAuth()

const links = [
  { href: '#how', label: 'Как это работает' },
  { href: '#levels', label: 'Уровни' },
  { href: '#progress', label: 'Прогресс' },
  { href: '#leaderboard', label: 'Рейтинг' },
  { href: '#roles', label: 'Команды' },
]

const displayName = computed(() => {
  const u = user.value as any
  return u?.username ?? u?.email ?? 'игрок'
})

const initial = computed(() => (displayName.value[0] ?? '?').toUpperCase())

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
    <div class="max-w-[1320px] mx-auto px-8 flex items-center justify-between h-[72px] gap-8">
      <a href="#" class="flex items-center gap-3">
        <img src="/voxel/logo.png" alt="Фабрика решений" class="logo-mark h-7 [image-rendering:pixelated]" />
        <span class="hidden xl:inline font-mono text-[11px] tracking-[0.08em] uppercase text-ink-3 border-l border-line-strong pl-3 whitespace-nowrap">
          <img src="/voxel/school21.png" alt="Фабрика решений" class="logo-mark h-7 [image-rendering:pixelated]" />
        </span>
      </a>

      <div class="hidden md:flex gap-7 items-center text-sm text-ink-2">
        <a v-for="l in links" :key="l.href" :href="l.href" class="py-2 transition-colors duration-150 hover:text-cyan-brand">
          {{ l.label }}
        </a>
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
          <div class="profile-avatar w-9 h-9 rounded-[10px] flex items-center justify-center font-pix text-white text-base" style="background: linear-gradient(135deg, var(--color-purple-brand), var(--color-cyan-brand))">
            {{ initial }}
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
