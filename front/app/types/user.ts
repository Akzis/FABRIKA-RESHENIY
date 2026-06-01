/** Extended fields on the Strapi User served via /api/users/me. */
export interface UserProfile {
  id: number | string
  username: string
  email: string
  displayName?: string | null
  avatar?: { id?: number; url?: string } | null
  team?: string | null
  teamRole?: 'member' | 'pm' | null
  xp?: number | null
  /** XP spent in the shop. Balance available to spend = xp − spentXp. */
  spentXp?: number | null
  level?: number | null
  xpToNextLevel?: number | null
  streak?: number | null
  challengesClosed?: number | null
  badgesCount?: number | null
  teamCupPlace?: number | null
  teamCupCurrent?: number | null
  teamCupTotal?: number | null
  completedDailyQuests?: { id: number; documentId?: string }[] | null
  completedChallenges?: { id: number; documentId?: string }[] | null
  earnedBadges?: { id: number; documentId?: string; code?: string; label?: string; rewardImage?: string | null }[] | null
  profileActivated?: boolean | null
  /** Profile-header customization, persisted server-side via /users/me/profile-header. */
  profileHeader?: {
    color: string
    image: string
    imageX: number
    imageY: number
    imageSize: number
  } | null
}
