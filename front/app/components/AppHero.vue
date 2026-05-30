<script setup lang="ts">
const { heroStats } = useLandingData()

const accentMap: Record<string, string> = {
  cyan: 'var(--color-cyan-brand)',
  mint: 'var(--color-mint-brand)',
  purple: 'var(--color-purple-brand)',
}

useHeroEntrance()
useBarFill('.hero-scene-bar', { duration: 1.6 })
</script>

<template>
  <section class="relative pt-[90px] pb-[60px] overflow-hidden [perspective:1200px]">
    <div class="absolute inset-0 dotted-grid-bg pointer-events-none"></div>

    <div class="relative z-[2] max-w-[1320px] mx-auto px-8 grid lg:grid-cols-[1.05fr_1fr] gap-15 items-center">
      <div>
  

        <h1 class="font-pix font-bold text-[clamp(56px,7vw,104px)] leading-[0.92] tracking-[-0.01em] my-[22px_0_28px] uppercase">
          <span class="hero-title-line block">Качай <span class="text-cyan-brand">скилл</span>.</span>
          <span class="hero-title-line block">Бери <span class="text-mint-brand">челлендж</span>.</span>
          <span class="hero-title-line block">Получай <span class="text-purple-brand">награду</span>.</span>
        </h1>

        <p class="hero-lede text-[18px] leading-[1.55] text-ink-2 max-w-[520px] mt-6 mb-9">
          Превращаем рабочие задачи в игру с уровнями LIGHT, MEDIUM и HARD. Команды выполняют челленджи, копят баллы
          и поднимаются по рейтингу — а вы видите прогресс в реальном времени.
        </p>

        <div class="flex gap-3.5 flex-wrap items-center">
          <span class="hero-cta">
            <BaseButton variant="primary" size="lg" as="a" href="#progress">
              К моему дашборду <span>→</span>
            </BaseButton>
          </span>
          <span class="hero-cta">
            <BaseButton variant="ghost" size="lg" as="a" href="#how">Как это работает</BaseButton>
          </span>
        </div>

        <div class="flex gap-8 mt-14 pt-8 border-t border-line">
          <div v-for="(s, i) in heroStats" :key="i" class="hero-stat">
            <div class="font-pix text-[36px] leading-none" :style="{ color: accentMap[s.accent ?? 'cyan'] ?? 'white' }">
              {{ s.value }}
            </div>
            <div class="font-mono text-[11px] tracking-[0.12em] text-ink-3 mt-2 uppercase">{{ s.label }}</div>
          </div>
        </div>
      </div>

      <div class="relative h-[600px]">
        <div class="absolute inset-0 deco-grid-bg"></div>
        <div class="scene-blob absolute rounded-full blur-[80px] opacity-45 w-[360px] h-[360px] bg-cyan-brand top-[10%] right-[-10%]"></div>
        <div class="scene-blob absolute rounded-full blur-[80px] opacity-35 w-[320px] h-[320px] bg-purple-brand bottom-[10%] left-[-5%]"></div>

        <div class="scene-card absolute left-[30px] top-[30px] z-[3] border border-line-strong rounded-xl py-3.5 px-4 backdrop-blur-md flex items-center gap-3" style="background: var(--color-panel-bg)">
          <span class="w-2.5 h-2.5 bg-mint-brand rounded-full shadow-[0_0_12px_var(--color-mint-brand)]"></span>
          <span class="font-mono text-[12px] tracking-[0.06em] text-ink-2">
            <b class="text-mint-brand font-semibold">+250 XP</b> · челлендж выполнен
          </span>
        </div>

        <img src="/voxel/dino.png" class="scene-vox absolute w-[260px] right-[50px] top-[20px] drop-shadow-[0_30px_50px_rgba(0,0,0,0.6)] animate-float transition-transform duration-300 hover:-translate-y-1.5" alt="" />
        <img src="/voxel/note.png" class="scene-vox absolute w-[180px] left-0 top-[110px] drop-shadow-[0_30px_50px_rgba(0,0,0,0.6)] animate-float-1" alt="" />
        <img src="/voxel/arrow.png" class="scene-vox absolute w-[200px] right-[30px] bottom-[80px] drop-shadow-[0_30px_50px_rgba(0,0,0,0.6)] animate-float-2" alt="" />
        <img src="/voxel/chat.png" class="scene-vox absolute w-[150px] left-[80px] bottom-[60px] drop-shadow-[0_30px_50px_rgba(0,0,0,0.6)] animate-float-3" alt="" />

        <div class="scene-xp absolute right-5 bottom-5 z-[3] w-[280px] p-[18px] border border-line-strong rounded-[14px] backdrop-blur-md" style="background: var(--color-panel-bg)">
          <div class="flex justify-between items-center font-mono text-[11px] tracking-[0.08em] text-ink-3 uppercase mb-2.5">
            <span>Текущий уровень</span>
            <span>14 / 25</span>
          </div>
          <div class="font-pix text-[22px] text-cyan-brand mb-3">LVL 14 · Инженер</div>
          <div class="h-2.5 bg-bg-3 rounded-full overflow-hidden">
            <div class="hero-scene-bar h-full rounded-full bg-gradient-to-r from-cyan-brand to-mint-brand shadow-[0_0_14px_rgba(24,239,242,0.5)]" style="width: 68%"></div>
          </div>
          <div class="flex justify-between font-mono text-[11px] text-ink-2 mt-2.5">
            <span>3 420 XP</span>
            <span>до след. уровня 580 XP</span>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
