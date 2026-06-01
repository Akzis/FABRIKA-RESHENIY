import { defineStore } from 'pinia'
import type {
  Badge,
  ChallengeLevel,
  ChallengeTask,
  DailyQuest,
  HeroStat,
  HowStep,
  LeaderboardRow,
  RoleCard,
  TeamLeaderboardRow,
} from '~/types/landing'

interface LandingState {
  heroStats: HeroStat[]
  howSteps: HowStep[]
  levels: ChallengeLevel[]
  challenges: ChallengeTask[]
  badges: Badge[]
  daily: DailyQuest[]
  leaderboard: LeaderboardRow[]
  teamLeaderboard: TeamLeaderboardRow[]
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
    challenges: [],
    badges: [],
    daily: [],
    leaderboard: [],
    teamLeaderboard: [],
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
