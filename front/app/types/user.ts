/** Extended fields on the Strapi User served via /api/users/me. */
export interface UserProfile {
  id: number | string
  username: string
  email: string
  displayName?: string | null
  team?: string | null
  teamRole?: 'member' | 'pm' | null
  xp?: number | null
  level?: number | null
  xpToNextLevel?: number | null
  streak?: number | null
  challengesClosed?: number | null
  badgesCount?: number | null
  teamCupPlace?: number | null
  teamCupCurrent?: number | null
  teamCupTotal?: number | null
  completedDailyQuests?: { id: number; documentId?: string }[] | null
  profileActivated?: boolean | null
}
