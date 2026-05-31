<script setup lang="ts">
import type { UserProfile } from '~/types/user'

const { logout } = useStrapiAuth()
const user = useStrapiUser<UserProfile>()

const handleLogout = async () => {
  await logout()
}
</script>

<template>
  <div class="min-h-screen flex flex-col">
    <header class="border-b border-line" style="background: var(--color-nav-bg)">
      <div class="max-w-[1320px] mx-auto px-8 flex items-center justify-between h-[72px]">
        <div class="flex items-center gap-3">
          <BrandLogo light="/voxel/logo.png" dark="/voxel/logowhite.png" img-class="logo-mark h-7 [image-rendering:pixelated]" />
          <span class="hidden md:inline font-mono text-[11px] tracking-[0.08em] uppercase text-ink-3 border-l border-line-strong pl-3 whitespace-nowrap">
            <BrandLogo light="/voxel/school21.png" dark="/voxel/school21(white).png" alt="Школа 21" img-class="logo-mark h-7 [image-rendering:pixelated]" />
          </span>
        </div>
        <div class="flex items-center gap-4">
          <ThemeToggle />
          <button
            type="button"
            class="font-mono text-[11px] tracking-[0.1em] uppercase text-ink-3 hover:text-ink transition-colors cursor-pointer bg-transparent border-0 p-0"
            @click="handleLogout"
          >
            Выйти
          </button>
        </div>
      </div>
    </header>

    <main class="relative flex-1 flex items-center justify-center px-4 py-16 overflow-hidden">
      <div class="absolute inset-0 dotted-grid-bg pointer-events-none"></div>

      <div class="scene-blob absolute rounded-full blur-[120px] opacity-25 w-[460px] h-[460px] bg-purple-brand -top-20 -right-20 pointer-events-none"></div>
      <div class="scene-blob absolute rounded-full blur-[120px] opacity-20 w-[420px] h-[420px] bg-cyan-brand -bottom-32 -left-20 pointer-events-none"></div>

      <div class="relative w-full max-w-[520px] bg-bg-2 border border-line-strong rounded-[22px] p-10 shadow-[0_30px_80px_rgba(0,0,0,0.4)] text-center">
        <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[rgba(181,89,243,0.12)] border border-[rgba(181,89,243,0.3)] mb-6">
          <span class="text-3xl">⏳</span>
        </div>

        <h3 class="font-pix text-[32px] m-0 mb-3 uppercase leading-tight">
          Ожидание <span class="text-purple-brand">активации</span>
        </h3>

        <p class="text-sm text-ink-3 m-0 mb-8 leading-relaxed">
          Твой профиль командного менеджера зарегистрирован. Администратор должен активировать
          профиль и команду в системе — после этого тебе откроется полный доступ.
        </p>

        <div class="bg-bg-3 border border-line rounded-[14px] p-5 mb-8 text-left">
          <div class="grid gap-3">
            <div class="flex items-center justify-between">
              <span class="font-mono text-[10px] tracking-[0.12em] uppercase text-ink-3">Логин</span>
              <span class="font-mono text-[13px] text-ink">{{ user?.username }}</span>
            </div>
            <div class="h-px bg-line"></div>
            <div class="flex items-center justify-between">
              <span class="font-mono text-[10px] tracking-[0.12em] uppercase text-ink-3">Команда</span>
              <span class="font-mono text-[13px] text-purple-brand">{{ user?.team || '—' }}</span>
            </div>
            <div class="h-px bg-line"></div>
            <div class="flex items-center justify-between">
              <span class="font-mono text-[10px] tracking-[0.12em] uppercase text-ink-3">Роль</span>
              <span class="font-mono text-[13px] text-ink">Проектный менеджер</span>
            </div>
            <div class="h-px bg-line"></div>
            <div class="flex items-center justify-between">
              <span class="font-mono text-[10px] tracking-[0.12em] uppercase text-ink-3">Статус</span>
              <span class="inline-flex items-center gap-1.5 font-mono text-[12px] text-[#f5a623]">
                <span class="inline-block w-1.5 h-1.5 rounded-full bg-[#f5a623] animate-pulse"></span>
                Ожидает активации
              </span>
            </div>
          </div>
        </div>

        <p class="text-xs text-ink-3 mb-6 leading-relaxed">
          Обратись к администратору платформы или дождись подтверждения.
          Страница обновится автоматически после активации.
        </p>

        <button
          type="button"
          class="font-mono text-[11px] tracking-[0.1em] uppercase text-ink-3 hover:text-ink transition-colors cursor-pointer bg-transparent border-0 p-0"
          @click="handleLogout"
        >
          ← Выйти из аккаунта
        </button>
      </div>
    </main>
  </div>
</template>
