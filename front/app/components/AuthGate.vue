<script setup lang="ts">
import { ref, computed } from 'vue'

type Mode = 'login' | 'register'
type Role = 'member' | 'pm'

const { login, register, fetchUser } = useStrapiAuth()
const invite = useTeamInvite()
const strapiUrl = (useRuntimeConfig().public as any)?.strapi?.url ?? 'http://localhost:1337'

const mode = ref<Mode>('login')
const role = ref<Role>('member')

const username = ref('')
const email = ref('')
const password = ref('')
const teamName = ref('')
const error = ref<string | null>(null)
const submitting = ref(false)

const isLogin = computed(() => mode.value === 'login')
const title = computed(() => isLogin.value ? 'Войти' : 'Регистрация')
const subtitle = computed(() =>
  isLogin.value
    ? 'Введи логин команды, выданный администратором.'
    : 'Создай учётку — стартовый бонус +100 XP при регистрации. Админка — только в CMS.',
)
const ctaText = computed(() => isLogin.value ? 'Войти' : 'Зарегистрироваться')

const submit = async () => {
  error.value = null
  if (!password.value) {
    error.value = 'Введи пароль'
    return
  }
  if (isLogin.value && !username.value) {
    error.value = 'Введи логин или email'
    return
  }
  if (!isLogin.value && (!username.value || !email.value)) {
    error.value = 'Заполни логин и email'
    return
  }
  if (!isLogin.value && role.value === 'pm' && !teamName.value.trim()) {
    error.value = 'Введи название команды'
    return
  }

  submitting.value = true
  try {
    if (isLogin.value) {
      await login({ identifier: username.value.trim(), password: password.value })
    } else {
      await register({
        username: username.value.trim(),
        email: email.value.trim(),
        password: password.value,
      })
      // Persist the chosen team role on the user record so the leaderboard
      // and profile reflect "Участник" vs "Проектный менеджер" immediately.
      const token = useStrapiToken().value
      if (token) {
        try {
          await $fetch(`${strapiUrl}/api/users/me/role`, {
            method: 'POST',
            body: { role: role.value, teamName: teamName.value.trim() || undefined },
            headers: { Authorization: `Bearer ${token}` },
          })
          await fetchUser() // refresh useStrapiUser() with the new teamRole
        } catch { /* swallow: role stays default */ }
      }
    }
    if (import.meta.client) {
      try { localStorage.setItem('fr-role', role.value) } catch { /* ignore */ }
    }
    // If this visitor arrived via a PM's invite link, join that team now.
    await invite.redeem()
    // The page wrapping us re-renders into the landing as soon as user state flips.
  } catch (e: any) {
    error.value = e?.error?.message ?? e?.data?.error?.message ?? e?.message ?? 'Не удалось войти'
  } finally {
    submitting.value = false
  }
}

const switchMode = (m: Mode) => {
  mode.value = m
  error.value = null
}
</script>

<template>
  <div class="min-h-screen flex flex-col">
    <!-- roaming voxel cursor that drifts across the whole page in the background -->
    <img
      src="/voxel/arrow.png"
      alt=""
      aria-hidden="true"
      class="voxel-cursor [image-rendering:pixelated]"
    />

    <header class="border-b border-line" style="background: var(--color-nav-bg)">
      <div class="max-w-[1320px] mx-auto px-4 sm:px-8 flex items-center justify-between h-[72px]">
        <div class="flex items-center gap-3">
          <BrandLogo light="/voxel/logo.png" dark="/voxel/logowhite.png" img-class="logo-mark h-7 [image-rendering:pixelated]" />
          <span class="hidden md:inline font-mono text-[11px] tracking-[0.08em] uppercase text-ink-3 border-l border-line-strong pl-3 whitespace-nowrap">
            <BrandLogo light="/voxel/school21.png" dark="/voxel/school21(white).png" alt="Школа 21" img-class="logo-mark h-7 [image-rendering:pixelated]" />
          </span>
        </div>
        <ThemeToggle />
      </div>
    </header>

    <main class="relative flex-1 flex items-center justify-center px-4 py-16 overflow-hidden">
      <div class="absolute inset-0 dotted-grid-bg pointer-events-none"></div>

      <div class="scene-blob absolute rounded-full blur-[120px] opacity-30 w-[460px] h-[460px] bg-cyan-brand -top-20 -right-20 pointer-events-none"></div>
      <div class="scene-blob absolute rounded-full blur-[120px] opacity-25 w-[420px] h-[420px] bg-purple-brand -bottom-32 -left-20 pointer-events-none"></div>

      <div class="relative z-10 w-full max-w-[460px] bg-bg-2 border border-line-strong rounded-[22px] p-6 sm:p-10 shadow-[0_30px_80px_rgba(0,0,0,0.4)]">
        <div class="grid grid-cols-2 gap-2 p-1 bg-bg-3 rounded-xl mb-7">
          <button
            type="button"
            @click="switchMode('login')"
            :class="[
              'py-2.5 rounded-lg font-mono text-[11px] tracking-[0.14em] uppercase transition-all duration-150',
              isLogin ? 'bg-cyan-brand text-btn-ink' : 'text-ink-3 hover:text-ink-2',
            ]"
          >Вход</button>
          <button
            type="button"
            @click="switchMode('register')"
            :class="[
              'py-2.5 rounded-lg font-mono text-[11px] tracking-[0.14em] uppercase transition-all duration-150',
              !isLogin ? 'bg-cyan-brand text-btn-ink' : 'text-ink-3 hover:text-ink-2',
            ]"
          >Регистрация</button>
        </div>

        <h3 class="font-pix text-[36px] m-0 mb-2 uppercase">
          {{ title }} в <span class="text-cyan-brand">Фабрику</span>
        </h3>
        <p class="text-sm text-ink-3 m-0 mb-7">{{ subtitle }}</p>

        <div class="grid grid-cols-2 gap-2 mb-6">
          <button
            type="button"
            @click="role = 'member'"
            :class="[
              'py-3.5 px-3 bg-bg border rounded-[10px] font-mono text-[11px] tracking-[0.1em] uppercase cursor-pointer transition-all duration-150',
              role === 'member' ? 'border-cyan-brand text-cyan-brand bg-[rgba(24,239,242,0.08)]' : 'border-line-strong text-ink-2',
            ]"
          >Участник</button>
          <button
            type="button"
            @click="role = 'pm'"
            :class="[
              'py-3.5 px-3 bg-bg border rounded-[10px] font-mono text-[11px] tracking-[0.1em] uppercase cursor-pointer transition-all duration-150',
              role === 'pm' ? 'border-cyan-brand text-cyan-brand bg-[rgba(24,239,242,0.08)]' : 'border-line-strong text-ink-2',
            ]"
          >Проектный менеджер</button>
        </div>

        <form @submit.prevent="submit" novalidate>
          <div class="mb-[18px]">
            <label class="block font-mono text-[10px] tracking-[0.14em] text-ink-3 uppercase mb-2">
              {{ isLogin ? 'Логин или email' : 'Логин' }}
            </label>
            <input
              v-model="username"
              type="text"
              autocomplete="username"
              placeholder="ivanov.i"
              class="w-full py-3.5 px-4 bg-bg border border-line-strong rounded-[10px] text-ink text-[15px] outline-none transition-colors duration-150 focus:border-cyan-brand"
            />
          </div>

          <div v-if="!isLogin" class="mb-[18px]">
            <label class="block font-mono text-[10px] tracking-[0.14em] text-ink-3 uppercase mb-2">Email</label>
            <input
              v-model="email"
              type="email"
              autocomplete="email"
              placeholder="ivanov@team.ru"
              class="w-full py-3.5 px-4 bg-bg border border-line-strong rounded-[10px] text-ink text-[15px] outline-none transition-colors duration-150 focus:border-cyan-brand"
            />
          </div>

          <div v-if="!isLogin && role === 'pm'" class="mb-[18px]">
            <label class="block font-mono text-[10px] tracking-[0.14em] text-ink-3 uppercase mb-2">Название команды</label>
            <input
              v-model="teamName"
              type="text"
              autocomplete="off"
              placeholder="Команда Альфа"
              class="w-full py-3.5 px-4 bg-bg border border-line-strong rounded-[10px] text-ink text-[15px] outline-none transition-colors duration-150 focus:border-cyan-brand"
            />
            <p class="mt-1.5 font-mono text-[10px] tracking-[0.06em] text-ink-3">
              Профиль будет активирован администратором
            </p>
          </div>

          <div class="mb-[18px]">
            <label class="block font-mono text-[10px] tracking-[0.14em] text-ink-3 uppercase mb-2">Пароль</label>
            <input
              v-model="password"
              type="password"
              :autocomplete="isLogin ? 'current-password' : 'new-password'"
              placeholder="••••••••"
              class="w-full py-3.5 px-4 bg-bg border border-line-strong rounded-[10px] text-ink text-[15px] outline-none transition-colors duration-150 focus:border-cyan-brand"
            />
          </div>

          <p
            v-if="error"
            class="font-mono text-[12px] tracking-[0.04em] text-[#ff7575] bg-[rgba(255,117,117,0.08)] border border-[rgba(255,117,117,0.25)] rounded-lg py-2.5 px-3 mb-4"
          >
            {{ error }}
          </p>

          <BaseButton
            variant="primary"
            size="lg"
            as="button"
            class="w-full justify-center"
            :disabled="submitting"
          >
            {{ submitting ? 'Проверяем…' : ctaText }} <span v-if="!submitting">→</span>
          </BaseButton>
        </form>

        <div class="text-xs text-ink-3 text-center mt-5">
          <template v-if="isLogin">
            Нет аккаунта?
            <button type="button" @click="switchMode('register')" class="text-cyan-brand hover:underline cursor-pointer bg-transparent border-0 p-0">Зарегистрируйся</button>
          </template>
          <template v-else>
            Уже есть аккаунт?
            <button type="button" @click="switchMode('login')" class="text-cyan-brand hover:underline cursor-pointer bg-transparent border-0 p-0">Войти</button>
          </template>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
.voxel-deco {
  z-index: 0;
  opacity: 0.9;
  pointer-events: none;
  user-select: none;
  filter: drop-shadow(0 12px 26px rgba(0, 0, 0, 0.5));
  transform-origin: center;
  animation-name: voxelJitter;
  animation-timing-function: ease-in-out;
  animation-iteration-count: infinite;
  will-change: transform;
}

/* smooth float + gentle sway so the pieces feel alive without jitter */
@keyframes voxelJitter {
  0%, 100% { transform: translateY(0) rotate(-5deg); }
  50%      { transform: translateY(-16px) rotate(5deg); }
}

@media (prefers-reduced-motion: reduce) {
  .voxel-deco { animation: none; }
}

/* a lone voxel cursor that wanders the whole page in the background */
.voxel-cursor {
  position: fixed;
  top: 0;
  left: 0;
  width: 120px;
  height: auto;
  z-index: 0;
  opacity: 0.5;
  pointer-events: none;
  user-select: none;
  filter: drop-shadow(0 8px 18px rgba(0, 0, 0, 0.45));
  will-change: transform;
  animation: voxelCursorRoam 28s ease-in-out infinite;
}

/* drift across the viewport using vw/vh so it covers the full page,
   with little tilts so it feels like it's being "moved" by hand */
@keyframes voxelCursorRoam {
  0%   { transform: translate(8vw, 18vh) rotate(-8deg); }
  15%  { transform: translate(72vw, 12vh) rotate(6deg); }
  30%  { transform: translate(85vw, 65vh) rotate(-4deg); }
  45%  { transform: translate(40vw, 80vh) rotate(10deg); }
  60%  { transform: translate(12vw, 60vh) rotate(-6deg); }
  75%  { transform: translate(55vw, 35vh) rotate(4deg); }
  90%  { transform: translate(80vw, 22vh) rotate(-8deg); }
  100% { transform: translate(8vw, 18vh) rotate(-8deg); }
}

@media (prefers-reduced-motion: reduce) {
  .voxel-cursor { animation: none; }
}
</style>
