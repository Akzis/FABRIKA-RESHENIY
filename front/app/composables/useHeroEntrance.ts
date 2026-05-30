import { onBeforeUnmount, onMounted } from 'vue'

/**
 * Hero entry timeline: orchestrates eyebrow → title lines → lede → CTAs → stats → scene.
 * Each element opts in via marker classes (.hero-eyebrow, .hero-title-line, .hero-lede,
 * .hero-cta, .hero-stat, .scene-blob, .scene-vox, .scene-card, .scene-xp).
 */
export const useHeroEntrance = () => {
  if (!import.meta.client) return

  let ctx: { revert?: () => void } | null = null

  onMounted(async () => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const gsapMod = await import('gsap')
    const gsap = (gsapMod as any).gsap ?? gsapMod.default

    await new Promise<void>((r) => requestAnimationFrame(() => r()))

    ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out', duration: 0.8 } })

      // ambient blobs spring up first, behind everything else
      tl.from('.scene-blob', { scale: 0.2, opacity: 0, duration: 1.6, ease: 'power2.out', stagger: 0.15 }, 0)
        .from('.hero-eyebrow', { y: -14, opacity: 0, duration: 0.6 }, 0.1)
        .from('.hero-title-line', {
          y: 80, opacity: 0, rotationX: -50, transformOrigin: '50% 100%',
          duration: 1, stagger: 0.12, ease: 'power4.out',
        }, '-=0.2')
        .from('.hero-lede', { y: 24, opacity: 0, duration: 0.7 }, '-=0.45')
        .from('.hero-cta', { y: 20, opacity: 0, stagger: 0.1, duration: 0.6 }, '-=0.45')
        .from('.hero-stat', { y: 30, opacity: 0, stagger: 0.12, duration: 0.6 }, '-=0.4')
        .from('.scene-card, .scene-xp', { x: 40, opacity: 0, stagger: 0.18, duration: 0.9 }, '-=1.2')
        .from('.scene-vox', {
          scale: 0.4, opacity: 0, rotation: -8,
          stagger: { each: 0.12, from: 'random' },
          duration: 0.9, ease: 'back.out(2)',
        }, '-=1.4')
    })
  })

  onBeforeUnmount(() => {
    ctx?.revert?.()
  })
}
