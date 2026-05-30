<script setup lang="ts">
import { computed } from 'vue'

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
  // user becomes null → pages/index.vue swaps back to AuthGate automatically
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
        <div class="hidden sm:flex items-center gap-2.5 pl-3 border-l border-line-strong">
          <div class="w-9 h-9 rounded-[10px] flex items-center justify-center font-pix text-white text-base" style="background: linear-gradient(135deg, var(--color-purple-brand), var(--color-cyan-brand))">
            {{ initial }}
          </div>
          <span class="font-mono text-[12px] tracking-[0.04em] text-ink-2 max-w-[140px] truncate">{{ displayName }}</span>
        </div>
        <BaseButton variant="ghost" @click="onLogout">Выйти</BaseButton>
      </div>
    </div>
  </nav>
</template>
