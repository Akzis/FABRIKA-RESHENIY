import { onBeforeUnmount, onMounted } from 'vue'

interface RevealOpts {
  y?: number
  x?: number
  scale?: number
  rotation?: number
  blur?: number
  duration?: number
  delay?: number
  stagger?: number
  ease?: string
  start?: string
  trigger?: string
  once?: boolean
}

/**
 * Scroll-triggered reveal: from (y, x, scale, rotation, blur, opacity:0) → to current style.
 * Honours prefers-reduced-motion — skips the animation entirely.
 */
export const useReveal = (selector: string, opts: RevealOpts = {}) => {
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
      const els = document.querySelectorAll(selector)
      if (!els.length) return

      const from: Record<string, unknown> = {
        opacity: 0,
        y: opts.y ?? 36,
        x: opts.x ?? 0,
        scale: opts.scale ?? 1,
        rotation: opts.rotation ?? 0,
      }
      if (opts.blur) from.filter = `blur(${opts.blur}px)`

      gsap.from(els, {
        ...from,
        duration: opts.duration ?? 0.9,
        delay: opts.delay ?? 0,
        ease: opts.ease ?? 'power3.out',
        stagger: opts.stagger ?? 0.08,
        clearProps: opts.blur ? 'filter,transform' : 'transform',
        scrollTrigger: {
          trigger: opts.trigger ?? selector,
          start: opts.start ?? 'top 85%',
          toggleActions: opts.once === false ? 'play none none reverse' : 'play none none none',
        },
      })
    })
  })

  onBeforeUnmount(() => {
    ctx?.revert?.()
  })
}
