<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

interface Props {
  tag: string
  tagColor?: string
  sub: string
}
withDefaults(defineProps<Props>(), {
  tagColor: 'var(--color-cyan-brand)',
})

// Per-instance reveal — each SectionHeader fires its own GSAP timeline
// when its DOM root scrolls into view.
const root = ref<HTMLElement | null>(null)
let ctx: { revert?: () => void } | null = null

onMounted(async () => {
  if (!import.meta.client) return
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  if (!root.value) return

  const gsapMod = await import('gsap')
  const { ScrollTrigger } = await import('gsap/ScrollTrigger')
  const gsap = (gsapMod as any).gsap ?? gsapMod.default
  gsap.registerPlugin(ScrollTrigger)

  await new Promise<void>((r) => requestAnimationFrame(() => r()))

  ctx = gsap.context(() => {
    const tag = root.value!.querySelector('.s-tag')
    const title = root.value!.querySelector('.s-title')
    const sub = root.value!.querySelector('.s-sub')

    const tl = gsap.timeline({
      defaults: { ease: 'power3.out' },
      scrollTrigger: { trigger: root.value, start: 'top 85%' },
    })
    tl.from(tag, { y: -10, opacity: 0, duration: 0.5 })
      .from(title, { y: 50, opacity: 0, rotationX: -30, transformOrigin: '50% 100%', duration: 0.9 }, '-=0.2')
      .from(sub, { y: 20, opacity: 0, duration: 0.6 }, '-=0.5')
  }, root.value)
})

onBeforeUnmount(() => ctx?.revert?.())
</script>

<template>
  <div ref="root" class="flex justify-between items-end mb-14 gap-10 flex-wrap [perspective:1000px]">
    <div>
      <div class="s-tag font-mono text-xs tracking-[0.18em] text-ink-3 uppercase flex items-center gap-2.5 mb-4">
        <span class="inline-block w-2 h-2" :style="{ background: tagColor }"></span>
        {{ tag }}
      </div>
      <h2 class="s-title font-pix text-[clamp(40px,5vw,64px)] leading-[0.95] m-0 uppercase max-w-[720px]">
        <slot name="title" />
      </h2>
    </div>
    <p class="s-sub text-ink-2 text-[17px] leading-[1.55] max-w-[420px] m-0">{{ sub }}</p>
  </div>
</template>
