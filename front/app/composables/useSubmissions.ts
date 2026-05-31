/**
 * Challenge submissions — the review loop between a participant and their PM.
 *
 *   participant: POST /api/users/me/challenges/submit (multipart: challengeId,
 *                comment, files[]) → creates a `pending` submission.
 *   both:        GET  /api/users/me/submissions → PM sees the whole team's
 *                submissions, a participant sees only their own.
 *   PM:          POST /api/users/me/submissions/:id/review
 *                { decision: 'approved'|'rejected'|'partial', awardedXp?, reviewNote? }
 *                → credits XP on a pass, lets a rejected one be resubmitted.
 *
 * State is shared via useState so the tasks list and the PM review panel stay
 * in sync without refetching.
 */
import type { ChallengeSubmission, SubmissionStatus } from '~/types/landing'

export function useSubmissions() {
  const strapiBase = (useRuntimeConfig().public as any)?.strapi?.url ?? 'http://localhost:1337'
  const token = useStrapiToken()
  const { fetchUser } = useStrapiAuth()

  const submissions = useState<ChallengeSubmission[]>('fr-submissions', () => [])
  const loaded = useState<boolean>('fr-submissions-loaded', () => false)
  const loading = ref(false)

  const authHeaders = () =>
    token.value ? { Authorization: `Bearer ${token.value}` } : {}

  const fetch = async (): Promise<void> => {
    if (!token.value) return
    loading.value = true
    try {
      const res = await $fetch<{ data: ChallengeSubmission[] }>(
        `${strapiBase}/api/users/me/submissions`,
        { headers: authHeaders() },
      )
      submissions.value = res?.data ?? []
      loaded.value = true
    } catch {
      /* keep whatever we had */
    } finally {
      loading.value = false
    }
  }

  /** Participant submits a challenge for review (with optional attachments). */
  const submit = async (
    challengeId: number,
    comment: string,
    files: File[] = [],
  ): Promise<boolean> => {
    if (!token.value || !challengeId) return false
    const fd = new FormData()
    fd.append('challengeId', String(challengeId))
    fd.append('comment', comment ?? '')
    for (const f of files) fd.append('files', f)
    try {
      await $fetch(`${strapiBase}/api/users/me/challenges/submit`, {
        method: 'POST',
        body: fd,
        headers: authHeaders(),
      })
      await fetch()
      return true
    } catch {
      return false
    }
  }

  /** PM grades a submission; refreshes the list and own profile (XP). */
  const review = async (
    id: number,
    decision: SubmissionStatus,
    awardedXp?: number,
    reviewNote?: string,
  ): Promise<boolean> => {
    if (!token.value || !id) return false
    try {
      await $fetch(`${strapiBase}/api/users/me/submissions/${id}/review`, {
        method: 'POST',
        body: { decision, awardedXp, reviewNote },
        headers: authHeaders(),
      })
      await fetch()
      await fetchUser()
      return true
    } catch {
      return false
    }
  }

  // Most-recent submission per challenge id (participant view). The list is
  // already sorted newest-first server-side, so the first hit wins.
  const byChallenge = computed(() => {
    const m = new Map<number, ChallengeSubmission>()
    for (const s of submissions.value) {
      const cid = s.challenge?.id
      if (cid != null && !m.has(cid)) m.set(cid, s)
    }
    return m
  })

  return { submissions, loading, loaded, fetch, submit, review, byChallenge }
}
