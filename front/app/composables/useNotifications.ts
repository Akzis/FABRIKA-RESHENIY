/**
 * Live activity notifications shown in the hero scene card.
 *
 * Instead of wiring every completion site by hand, we watch the live user
 * profile (refreshed after each completion via fetchUser) and diff three
 * growing arrays — completedDailyQuests, completedChallenges, earnedBadges —
 * against a baseline seeded on first load. Anything that appears *after* the
 * baseline is a fresh event and becomes a toast. This catches daily quests,
 * challenge approvals (granted server-side by a PM) and achievements uniformly,
 * regardless of where the completion was triggered.
 */
import { ref } from 'vue'
import type { UserProfile } from '~/types/user'

export type NotificationAccent = 'mint' | 'cyan' | 'purple'

export interface AppNotification {
  id: number
  /** Trailing label, e.g. "челлендж выполнен". */
  text: string
  /** XP gained, shown as a "+N XP" prefix. Omitted when unknown. */
  xp?: number
  accent: NotificationAccent
}

// Shared singletons — module-level so every component sees the same queue and
// the profile watcher is installed exactly once.
const notifications = ref<AppNotification[]>([])
// The most recent event, kept around after the transient toast expires so the
// hero scene card can display "what you last earned" persistently.
const lastEvent = ref<AppNotification | null>(null)
let seq = 0
let watching = false

const AUTO_DISMISS_MS = 6000
const MAX_VISIBLE = 4

export function dismissNotification(id: number) {
  notifications.value = notifications.value.filter((n) => n.id !== id)
}

export function pushNotification(n: Omit<AppNotification, 'id'>, ttl = AUTO_DISMISS_MS) {
  const id = ++seq
  const entry = { id, ...n }
  // newest on top, cap the visible toast stack
  notifications.value = [entry, ...notifications.value].slice(0, MAX_VISIBLE)
  // sticky "latest" for the hero card (never auto-cleared)
  lastEvent.value = entry
  if (import.meta.client && ttl > 0) {
    window.setTimeout(() => dismissNotification(id), ttl)
  }
  return id
}

export function useNotifications() {
  // Install the profile → notification bridge once, on the client.
  if (import.meta.client && !watching) {
    watching = true

    const user = useStrapiUser<UserProfile>()
    const { daily, challenges } = useLandingData()

    // Baselines: ids/codes already present when the watcher first sees a
    // logged-in user. These never produce a toast.
    let seeded = false
    const seenDaily = new Set<number>()
    const seenChallenges = new Set<number>()
    const seenBadges = new Set<string | number>()

    const badgeKey = (b: { id: number; code?: string }) => b.code ?? b.id

    watch(
      user,
      (u) => {
        if (!u) return
        const doneDaily = u.completedDailyQuests ?? []
        const doneChallenges = u.completedChallenges ?? []
        const badges = u.earnedBadges ?? []

        if (!seeded) {
          for (const x of doneDaily) seenDaily.add(x.id)
          for (const x of doneChallenges) seenChallenges.add(x.id)
          for (const b of badges) seenBadges.add(badgeKey(b))
          seeded = true
          return
        }

        for (const x of doneDaily) {
          if (seenDaily.has(x.id)) continue
          seenDaily.add(x.id)
          const points = daily.value.find((q) => q.id === x.id)?.points
          pushNotification({ text: 'ежедневка выполнена', xp: points, accent: 'mint' })
        }

        for (const x of doneChallenges) {
          if (seenChallenges.has(x.id)) continue
          seenChallenges.add(x.id)
          const xp = challenges.value.find((c) => c.id === x.id)?.xp
          pushNotification({ text: 'челлендж выполнен', xp, accent: 'cyan' })
        }

        for (const b of badges) {
          const key = badgeKey(b)
          if (seenBadges.has(key)) continue
          seenBadges.add(key)
          pushNotification({ text: `достижение: ${b.label ?? 'новый бейдж'}`, accent: 'purple' })
        }
      },
      { immediate: true, deep: true },
    )
  }

  return { notifications, lastEvent, push: pushNotification, dismiss: dismissNotification }
}
