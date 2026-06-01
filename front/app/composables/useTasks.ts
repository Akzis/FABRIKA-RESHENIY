/**
 * Complete tasks (challenges / daily quests). Posts to /api/users/me/tasks/complete,
 * which records completion + awards XP server-side, then refreshes the user so
 * the UI reflects the new XP and "done" state. Idempotent on the backend.
 */
import type { UserProfile } from '~/types/user'

type Kind = 'challenge' | 'daily'

// Session-local completions (shared singletons; mutated only on the client).
// Merged with the server state so a task locks instantly and can't be re-fired.
const localChallenges = ref<Set<number>>(new Set())
const localDaily = ref<Set<number>>(new Set())

/** Badges the backend just granted on the last completion — for a toast/popup. */
export interface AwardedBadge { id: number; code?: string; label: string }
const lastAwardedBadges = ref<AwardedBadge[]>([])

export function useTasks() {
  const strapiBase = (useRuntimeConfig().public as any)?.strapi?.url ?? 'http://localhost:1337'
  const token = useStrapiToken()
  const { fetchUser } = useStrapiAuth()
  const user = useStrapiUser<UserProfile>()

  const completedChallengeIds = computed(() => {
    const s = new Set<number>(localChallenges.value)
    for (const c of user.value?.completedChallenges ?? []) if (c?.id != null) s.add(c.id)
    return s
  })
  const completedDailyIds = computed(() => {
    const s = new Set<number>(localDaily.value)
    for (const q of user.value?.completedDailyQuests ?? []) if (q?.id != null) s.add(q.id)
    return s
  })

  const complete = async (kind: Kind, id?: number): Promise<boolean> => {
    if (!token.value || !id) return false
    // already done? don't fire again
    const local = kind === 'challenge' ? localChallenges : localDaily
    if (local.value.has(id)) return false
    try {
      const res = await $fetch<{ awardedBadges?: AwardedBadge[] }>(
        `${strapiBase}/api/users/me/tasks/complete`,
        {
          method: 'POST',
          body: { kind, id },
          headers: { Authorization: `Bearer ${token.value}` },
        },
      )
      lastAwardedBadges.value = res?.awardedBadges ?? []
      // lock it immediately (reactive Set replace), then refresh xp/server state
      local.value = new Set(local.value).add(id)
      await fetchUser()
      return true
    } catch {
      return false
    }
  }

  return {
    completedChallengeIds,
    completedDailyIds,
    lastAwardedBadges,
    completeChallenge: (id?: number) => complete('challenge', id),
    completeDaily: (id?: number) => complete('daily', id),
  }
}
