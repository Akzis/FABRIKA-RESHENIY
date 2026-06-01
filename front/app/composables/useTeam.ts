/**
 * PM team roster + team rename.
 *   GET  /api/users/me/team          → { team, members[] with stats }
 *   POST /api/users/me/team/rename   → { name } (unique across teams)
 *
 * Shared via useState so the roster and the rest of the UI stay in sync.
 */
export interface TeamMember {
  id: number
  name: string
  username: string
  xp: number
  level: number
  challengesClosed: number
  streak: number
  badgesCount: number
  completedDailyCount: number
  avatarUrl: string | null
}

/** Per-day completion counts for the activity heatmap. */
export interface ActivityDay { challenges: number; dailies: number }
export interface MemberActivity {
  id: number
  name: string
  username: string
  avatarUrl: string | null
  totalChallenges: number
  totalDailies: number
  days: Record<string, ActivityDay>
}
export interface TeamActivity {
  from: string | null
  to: string | null
  members: MemberActivity[]
}

export function useTeam() {
  const strapiBase = (useRuntimeConfig().public as any)?.strapi?.url ?? 'http://localhost:1337'
  const token = useStrapiToken()
  const { fetchUser } = useStrapiAuth()

  const team = useState<{ id: number; name: string } | null>('fr-team', () => null)
  const members = useState<TeamMember[]>('fr-team-members', () => [])
  const loading = ref(false)

  const activity = useState<TeamActivity | null>('fr-team-activity', () => null)
  const activityLoading = ref(false)

  const authHeaders = () =>
    token.value ? { Authorization: `Bearer ${token.value}` } : {}

  const fetch = async (): Promise<void> => {
    if (!token.value) return
    loading.value = true
    try {
      const res = await $fetch<{ team: { id: number; name: string } | null; members: TeamMember[] }>(
        `${strapiBase}/api/users/me/team`,
        { headers: authHeaders() },
      )
      team.value = res?.team ?? null
      members.value = res?.members ?? []
    } catch {
      /* keep whatever we had */
    } finally {
      loading.value = false
    }
  }

  /** Fetch per-member, per-day completion counts for the activity heatmap. */
  const fetchActivity = async (): Promise<void> => {
    if (!token.value) return
    activityLoading.value = true
    try {
      const res = await $fetch<TeamActivity>(
        `${strapiBase}/api/users/me/team/activity`,
        { headers: authHeaders() },
      )
      activity.value = res ?? null
    } catch {
      /* keep whatever we had */
    } finally {
      activityLoading.value = false
    }
  }

  /** Rename the managed team. Returns an error message on failure, else null. */
  const rename = async (name: string): Promise<string | null> => {
    const trimmed = name.trim()
    if (!trimmed) return 'Введите название'
    if (!token.value) return 'Нет авторизации'
    try {
      const res = await $fetch<{ ok: boolean; team: string }>(
        `${strapiBase}/api/users/me/team/rename`,
        { method: 'POST', body: { name: trimmed }, headers: authHeaders() },
      )
      if (team.value) team.value = { ...team.value, name: res.team }
      await fetchUser() // refresh /me so the flattened `team` name updates everywhere
      return null
    } catch (e: any) {
      return e?.data?.error?.message ?? e?.message ?? 'Не удалось переименовать команду'
    }
  }

  /** Remove a member from the managed team. Returns an error message on failure, else null. */
  const removeMember = async (memberId: number): Promise<string | null> => {
    if (!token.value) return 'Нет авторизации'
    try {
      await $fetch(`${strapiBase}/api/users/me/team/members/${memberId}`, {
        method: 'DELETE',
        headers: authHeaders(),
      })
      members.value = members.value.filter((m) => m.id !== memberId)
      return null
    } catch (e: any) {
      return e?.data?.error?.message ?? e?.message ?? 'Не удалось удалить участника'
    }
  }

  return { team, members, loading, fetch, rename, removeMember, activity, activityLoading, fetchActivity }
}
