import { defineStore } from 'pinia'
import type {
  Achievement,
  Badge,
  ChallengeLevel,
  DailyQuest,
  HeroStat,
  HowStep,
  LeaderboardRow,
  RoleCard,
} from '~/types/landing'

interface LandingState {
  heroStats: HeroStat[]
  howSteps: HowStep[]
  levels: ChallengeLevel[]
  badges: Badge[]
  achievements: Achievement[]
  daily: DailyQuest[]
  leaderboard: LeaderboardRow[]
  roles: RoleCard[]
  loaded: boolean
  source: 'cms' | 'defaults'
}

/**
 * Source-of-truth for landing copy. Components read from this store and
 * never care whether the data came from Strapi or the local fallback —
 * the shape is identical.
 */
export const useLandingStore = defineStore('landing', {
  state: (): LandingState => ({
    heroStats: [],
    howSteps: [],
    levels: [],
    badges: [],
    achievements: [],
    daily: [],
    leaderboard: [],
    roles: [],
    loaded: false,
    source: 'defaults',
  }),
  actions: {
    hydrate(data: Partial<LandingState> & { source?: 'cms' | 'defaults' }) {
      Object.assign(this, data)
      this.loaded = true
    },
  },
})
