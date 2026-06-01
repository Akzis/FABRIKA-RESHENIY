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

  // Result of a completion attempt. `wrongAnswer` is set when a quiz daily was
  // answered incorrectly — nothing is awarded and the task stays open.
  type CompleteResult = { ok: boolean; wrongAnswer?: boolean }

  const complete = async (kind: Kind, id?: number, answer?: number): Promise<CompleteResult> => {
    if (!token.value || !id) return { ok: false }
    // already done? don't fire again
    const local = kind === 'challenge' ? localChallenges : localDaily
    if (local.value.has(id)) return { ok: false }
    try {
      const res = await $fetch<{ ok?: boolean; wrongAnswer?: boolean; awardedBadges?: AwardedBadge[] }>(
        `${strapiBase}/api/users/me/tasks/complete`,
        {
          method: 'POST',
          body: { kind, id, ...(answer != null ? { answer } : {}) },
          headers: { Authorization: `Bearer ${token.value}` },
        },
      )
      // Quiz answered wrong: server credits nothing and tells us so.
      if (res?.wrongAnswer) return { ok: false, wrongAnswer: true }
      lastAwardedBadges.value = res?.awardedBadges ?? []
      // lock it immediately (reactive Set replace), then refresh xp/server state
      local.value = new Set(local.value).add(id)
      await fetchUser()
      return { ok: true }
    } catch {
      return { ok: false }
    }
  }

  return {
    completedChallengeIds,
    completedDailyIds,
    lastAwardedBadges,
    completeChallenge: async (id?: number) => (await complete('challenge', id)).ok,
    completeDaily: (id?: number, answer?: number) => complete('daily', id, answer),
  }
}
