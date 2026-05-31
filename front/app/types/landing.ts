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

export interface Badge {
  id?: number
  symbol: string
  label: string
  accent?: Accent
  locked?: boolean
  got?: boolean
}

export interface Achievement {
  icon: string
  title: string
  text: string
  gain: string
  accent: Accent
}

export interface DailyQuest {
  id?: number
  title: string
  description?: string
  points: number
}

export type ChallengeTaskLevel = 'light' | 'medium' | 'hard'

export interface ChallengeTask {
  id?: number
  title: string
  description?: string
  level: ChallengeTaskLevel
  xp: number
}

export interface LeaderboardRow {
  rank: number
  userId?: number
  name: string
  team: string
  level: string
  closed: string
  xp: string
  deltaUp?: number
  deltaDown?: number
  gradient: string
  initial: string
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
