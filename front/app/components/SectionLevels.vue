<script setup lang="ts">
const { levels } = useLandingData()

const accentClass: Record<string, { tag: string; title: string; xp: string; glow: string; hover: string }> = {
  mint: {
    tag: 'text-mint-brand border-[rgba(82,242,197,0.4)] bg-[rgba(82,242,197,0.08)]',
    title: 'text-mint-brand',
    xp: 'text-mint-brand',
    glow: 'radial-gradient(circle at 100% 0%, var(--color-mint-brand) 0%, transparent 55%)',
    hover: 'hover:border-mint-brand',
  },
  cyan: {
    tag: 'text-cyan-brand border-[rgba(24,239,242,0.4)] bg-[rgba(24,239,242,0.08)]',
    title: 'text-cyan-brand',
    xp: 'text-cyan-brand',
    glow: 'radial-gradient(circle at 100% 0%, var(--color-cyan-brand) 0%, transparent 55%)',
    hover: 'hover:border-cyan-brand',
  },
  purple: {
    tag: 'text-purple-brand border-[rgba(181,89,243,0.4)] bg-[rgba(181,89,243,0.08)]',
    title: 'text-purple-brand',
    xp: 'text-purple-brand',
    glow: 'radial-gradient(circle at 100% 0%, var(--color-purple-brand) 0%, transparent 55%)',
    hover: 'hover:border-purple-brand',
  },
}

useReveal('.level-card', { stagger: 0.16, y: 70, scale: 0.94, rotation: 1.5, blur: 4, duration: 1.05, ease: 'power4.out' })
useReveal('.level-img', { stagger: 0.18, y: 30, scale: 0.6, duration: 1.1, ease: 'back.out(1.6)', delay: 0.2 })
</script>

<template>
  <section id="levels" class="py-[110px] relative">
    <div class="max-w-[1320px] mx-auto px-8">
      <SectionHeader tag="Уровни сложности" tag-color="var(--color-mint-brand)" sub="Стартуй с лёгкого, прокачивайся до хардкора. За каждый закрытый челлендж — реальные XP, бейджи и место в рейтинге.">
        <template #title>
          Три уровня —<br />один <span class="text-mint-brand">драйв</span>
        </template>
      </SectionHeader>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div
          v-for="lvl in levels"
          :key="lvl.key"
          :class="['level-card relative overflow-hidden bg-bg-2 border border-line rounded-[22px] px-8 pt-9 pb-8 transition-[transform,border-color] duration-300 hover:-translate-y-1.5', accentClass[lvl.accent].hover]"
        >
          <div class="absolute inset-0 opacity-20 pointer-events-none" :style="{ background: accentClass[lvl.accent].glow }"></div>

          <span :class="['relative inline-flex items-center gap-2 font-mono text-[11px] tracking-[0.14em] uppercase px-3 py-1.5 rounded-full border', accentClass[lvl.accent].tag]">
            {{ lvl.tag }}
          </span>

          <h3 :class="['relative font-pix text-[56px] leading-[0.95] mt-[22px] mb-3 uppercase', accentClass[lvl.accent].title]">{{ lvl.title }}</h3>

          <div class="relative h-[160px] flex items-end justify-center mt-1 mb-6">
            <img :src="lvl.image" class="level-img max-h-[160px] drop-shadow-[0_18px_30px_rgba(0,0,0,0.45)]" alt="" />
          </div>

          <ul class="relative m-0 p-0 list-none">
            <li
              v-for="(r, i) in lvl.rows"
              :key="i"
              :class="['text-sm text-ink-2 py-3 flex justify-between gap-3', i === 0 ? 'border-t border-line' : 'border-t border-dashed border-line']"
            >
              <span>{{ r.label }}</span>
              <b class="text-ink font-semibold font-mono">{{ r.value }}</b>
            </li>
          </ul>

          <div class="relative mt-6 py-3.5 px-4 rounded-xl bg-bg-3 flex items-center justify-between font-mono text-[12px] tracking-[0.08em] text-ink-3 uppercase">
            <span>База опыта</span>
            <b class="font-pix text-[22px] tracking-normal text-ink whitespace-nowrap">
              {{ lvl.baseXp }}<span :class="accentClass[lvl.accent].xp"> XP</span>
            </b>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
