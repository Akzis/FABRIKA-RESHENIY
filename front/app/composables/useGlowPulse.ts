import { onBeforeUnmount, onMounted } from 'vue'

/**
 * Looping pulse of box-shadow (e.g. top-1 leaderboard row glow).
 * Color expects an rgba/hex with alpha — animated 0 → strong → 0 in a yoyo.
 */
export const useGlowPulse = (
  selector: string,
  opts: { color?: string; spread?: number; duration?: number } = {},
) => {
  if (!import.meta.client) return

  let ctx: { revert?: () => void } | null = null

  onMounted(async () => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const gsapMod = await import('gsap')
    const gsap = (gsapMod as any).gsap ?? gsapMod.default

    await new Promise<void>((r) => requestAnimationFrame(() => r()))

    ctx = gsap.context(() => {
      const el = document.querySelector(selector)
      if (!el) return

      const color = opts.color ?? 'rgba(24, 239, 242, 0.45)'
      const spread = opts.spread ?? 36

      gsap.to(el, {
        boxShadow: `0 0 ${spread}px ${color}, 0 0 ${spread * 2}px ${color}`,
        duration: opts.duration ?? 1.8,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
      })
    })
  })

  onBeforeUnmount(() => {
    ctx?.revert?.()
  })
}
