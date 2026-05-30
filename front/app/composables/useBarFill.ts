import { onBeforeUnmount, onMounted } from 'vue'

interface BarOpts {
  duration?: number
  ease?: string
  stagger?: number
  start?: string
}

/**
 * Animate width-based fills (XP bars, scene progress, etc.) from 0 → their target width.
 * Reads inline `style.width` (preferred) or computed width as the target.
 */
export const useBarFill = (selector: string, opts: BarOpts = {}) => {
  if (!import.meta.client) return

  let ctx: { revert?: () => void } | null = null

  onMounted(async () => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const gsapMod = await import('gsap')
    const { ScrollTrigger } = await import('gsap/ScrollTrigger')
    const gsap = (gsapMod as any).gsap ?? gsapMod.default
    gsap.registerPlugin(ScrollTrigger)

    await new Promise<void>((r) => requestAnimationFrame(() => r()))

    ctx = gsap.context(() => {
      const els = document.querySelectorAll<HTMLElement>(selector)
      if (!els.length) return

      els.forEach((el, idx) => {
        const target = el.style.width || getComputedStyle(el).width || '0%'
        gsap.fromTo(
          el,
          { width: 0 },
          {
            width: target,
            duration: opts.duration ?? 1.4,
            ease: opts.ease ?? 'power3.out',
            delay: (opts.stagger ?? 0.12) * idx,
            scrollTrigger: {
              trigger: el,
              start: opts.start ?? 'top 90%',
            },
          },
        )
      })
    })
  })

  onBeforeUnmount(() => {
    ctx?.revert?.()
  })
}
