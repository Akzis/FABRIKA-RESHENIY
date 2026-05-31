<script setup lang="ts">
import { computed } from 'vue'
import type { UserProfile } from '~/types/user'
import type { Badge } from '~/types/landing'

const { badges, achievements } = useLandingData()
const user = useStrapiUser<UserProfile>()

const accentVar: Record<string, string> = {
  cyan: 'var(--color-cyan-brand)',
  mint: 'var(--color-mint-brand)',
  purple: 'var(--color-purple-brand)',
}

// Which badges this user has actually earned — pulled from /api/users/me
// (earnedBadges). A fresh account has none, so nothing shows as collected.
const earnedIds = computed(() => new Set((user.value?.earnedBadges ?? []).map(b => b.id)))
const isGot = (b: Badge) => b.id != null && earnedIds.value.has(b.id)
const earnedCount = computed(() => badges.value.filter(isGot).length)
const totalCount = computed(() => badges.value.length)

useReveal('.ach-grid', { y: 40, scale: 0.96, duration: 0.9 })
useReveal('.ach-grid .badge', { stagger: 0.04, y: 18, scale: 0.5, duration: 0.7, ease: 'back.out(2)', trigger: '.ach-grid', delay: 0.2 })
useReveal('.ach-item', { stagger: 0.12, x: 50, y: 0, duration: 0.85, ease: 'power3.out' })
</script>

<template>
  <section id="achievements" class="py-[110px] relative">
    <div class="max-w-[1320px] mx-auto px-8">
      <SectionHeader tag="Награды и достижения" tag-color="var(--color-purple-brand)" sub="42 достижения за активность, серии и редкие челленджи. Бейджи остаются в профиле навсегда — повод похвастаться в команде.">
        <template #title>
          Каждое<br />усилие — <span class="text-purple-brand">бейдж</span>
        </template>
      </SectionHeader>

      <div class="grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-7 items-start">
        <div class="ach-grid bg-bg-2 border border-line rounded-[22px] p-8">
          <div class="font-mono text-[11px] tracking-[0.14em] text-ink-3 uppercase mb-[22px] flex justify-between">
            <span>Коллекция бейджей</span>
            <span class="text-cyan-brand">{{ earnedCount }} / {{ totalCount }}</span>
          </div>
          <div class="grid grid-cols-3 sm:grid-cols-4 gap-3">
            <div
              v-for="(b, i) in badges"
              :key="i"
              :class="[
                'badge relative aspect-square rounded-[14px] bg-bg-3 border border-line flex flex-col items-center justify-center p-2.5 text-center gap-1.5 transition-[transform,border-color] duration-150 hover:-translate-y-0.5 hover:border-line-strong cursor-pointer',
                b.locked ? 'opacity-50' : '',
              ]"
              :style="isGot(b) ? { borderColor: accentVar[b.accent ?? 'cyan'] } : {}"
            >
              <span
                class="font-pix text-[28px] leading-none"
                :style="isGot(b) ? { color: accentVar[b.accent ?? 'cyan'] } : { color: 'var(--color-ink-3)' }"
              >{{ b.symbol }}</span>
              <span class="font-mono text-[10px] tracking-[0.06em] uppercase" :class="isGot(b) ? 'text-ink-2' : 'text-ink-3'">
                {{ b.label }}
              </span>
              <span v-if="b.locked" class="absolute top-2 right-2 text-[10px] opacity-60">🔒</span>
            </div>
          </div>
        </div>

        <div class="flex flex-col gap-3.5">
          <div
            v-for="(a, i) in achievements"
            :key="i"
            class="ach-item grid grid-cols-[56px_1fr_auto] gap-[18px] items-center py-[18px] px-[22px] bg-bg-2 border border-line rounded-2xl transition-[border-color,transform] duration-150 hover:border-line-strong hover:translate-x-1"
          >
            <div
              class="w-14 h-14 rounded-xl flex items-center justify-center bg-bg-3 font-pix text-[26px]"
              :style="{ color: accentVar[a.accent] }"
            >
              {{ a.icon }}
            </div>
            <div>
              <h4 class="m-0 mb-1 text-[15px] font-semibold">{{ a.title }}</h4>
              <p class="m-0 text-[13px] text-ink-3">{{ a.text }}</p>
            </div>
            <div class="font-pix text-[22px] text-right" :style="{ color: accentVar[a.accent] }">
              {{ a.gain }}<br /><span class="font-mono text-[10px] text-ink-3 tracking-[0.1em]">XP</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
