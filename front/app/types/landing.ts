export type Accent = 'cyan' | 'mint' | 'purple'

export interface HeroStat {
  value: string
  label: string
  accent?: Accent
}

export interface HowStep {
  n: string
  title: string
  text: string
  icon: string
}

export interface ChallengeLevel {
  key: 'lite' | 'med' | 'hard'
  tag: string
  title: string
  image: string
  rows: { label: string; value: string }[]
  baseXp: number
  accent: Accent
}

export type BadgeCondition =
  | 'none'
  | 'first_light_challenge'
  | 'first_medium_challenge'
  | 'first_hard_challenge'
  | 'reach_level'
  | 'complete_dailies'
  | 'streak_days'
  | 'complete_challenges'

export interface Badge {
  id?: number
  /** Stable identifier — matches across draft/published, unlike numeric id. */
  code?: string
  label: string
  /** Uploaded picture (Strapi media). The only thing shown on the coin. */
  image?: string
  accent?: Accent
  locked?: boolean
  got?: boolean
  /** How the badge is unlocked — drives the "что нужно" hint in the UI. */
  conditionType?: BadgeCondition
  conditionValue?: number
  /** XP paid out when the badge is earned. */
  xpReward?: number
  /** Profile-header picture this badge unlocks. */
  rewardImage?: string | null
}

export type DailyQuestKind = 'action' | 'quiz'

export interface DailyQuest {
  id?: number
  title: string
  description?: string
  points: number
  /** 'action' = press to confirm; 'quiz' = pick the right option. */
  kind?: DailyQuestKind
  /** Multiple-choice options (quiz only). The answer key stays server-side. */
  options?: string[]
}

export type ChallengeTaskLevel = 'light' | 'medium' | 'hard'

export interface ChallengeTask {
  id?: number
  title: string
  description?: string
  level: ChallengeTaskLevel
  xp: number
}

export type SubmissionStatus = 'pending' | 'approved' | 'rejected' | 'partial'

export interface SubmissionAttachment {
  id: number
  name: string
  url: string
  mime?: string
  size?: number
}

export interface ChallengeSubmission {
  id: number
  status: SubmissionStatus
  comment?: string
  awardedXp?: number
  reviewNote?: string
  reviewedAt?: string | null
  createdAt?: string
  challenge?: { id: number; title: string; level?: ChallengeTaskLevel; xp?: number } | null
  participant?: { id: number; name: string } | null
  attachments: SubmissionAttachment[]
}

export type ShopOrderStatus = 'pending' | 'delivered'

/** A shop purchase = an expected delivery the PM fulfils for a participant. */
export interface ShopOrder {
  id: number
  status: ShopOrderStatus
  itemTitle: string
  itemImage?: string
  itemTag?: string
  price: number
  createdAt?: string
  deliveredAt?: string | null
  participant?: { id: number; name: string } | null
}

export interface LeaderboardRow {
  rank: number
  userId?: number
  name: string
  team: string
  level: string
  closed: string
  xp: string
  /** Raw numeric values — used for sorting / re-ranking the table. */
  xpValue?: number
  closedValue?: number
  /** Current daily streak, in days. */
  streak?: number
  deltaUp?: number
  deltaDown?: number
  gradient: string
  initial: string
  me?: boolean
  /** Uploaded avatar photo — shown in the rank tile. */
  avatarUrl?: string | null
  /** profileHeader customization — painted as the row's banner background. */
  headerColor?: string | null
  headerImage?: string | null
  headerImageX?: number | null
  headerImageY?: number | null
  headerImageSize?: number | null
}

/** Aggregated team standing — built from the team's members. */
export interface TeamLeaderboardRow {
  rank: number
  name: string
  /** Number of members counted into the team totals. */
  members: number
  /** Sum of members' XP. */
  xpValue: number
  /** Sum of members' closed challenges. */
  closedValue: number
  /** Formatted XP, e.g. "1 635". */
  xp: string
  initial: string
  gradient: string
  me?: boolean
}

export interface RoleCard {
  key: 'member' | 'pm'
  tag: string
  title: string[]
  description: string
  image: string
  bullets: string[]
}
