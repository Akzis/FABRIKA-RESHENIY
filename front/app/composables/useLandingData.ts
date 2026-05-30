import { computed } from 'vue'
import type {
  Accent,
  Achievement,
  Badge,
  ChallengeLevel,
  DailyQuest,
  HeroStat,
  HowStep,
  LeaderboardRow,
  RoleCard,
} from '~/types/landing'
import { useLandingStore } from '~/stores/landing'

// ────────────────────────────────────────────────────────────────────────────
// Defaults — used when Strapi is unreachable or empty. Also seed source.
// ────────────────────────────────────────────────────────────────────────────

const accentFor = (a?: string | null): Accent =>
  a === 'mint' || a === 'purple' || a === 'cyan' ? a : 'cyan'

export const landingDefaults = {
  heroStats: [
    { value: '1 240', label: 'игроков на платформе', accent: 'cyan' },
    { value: '87k', label: 'челленджей закрыто', accent: 'mint' },
    { value: '42', label: 'команды в рейтинге', accent: 'purple' },
  ] as HeroStat[],

  howSteps: [
    { n: '01', title: 'Выбираешь\nчеллендж', text: 'Выбирай по сложности или подходящей теме. Дейли-задания обновляются каждый день в 9:00.', icon: '/voxel/keycaps.png' },
    { n: '02', title: 'Берёшь\nв работу', text: 'Закрепляешь задачу за собой. Команда видит твой прогресс и может подключиться к коллабу.', icon: '/voxel/notepad.png' },
    { n: '03', title: 'Сдаёшь\nрезультат', text: 'Прикладываешь решение, проектный менеджер ставит ✓. Опыт начисляется автоматически.', icon: '/voxel/arrow.png' },
    { n: '04', title: 'Забираешь\nнаграду', text: 'Тратишь баллы в магазине: мерч, кастомизация профиля, статус, бонусы и эксклюзивные ачивки.', icon: '/voxel/gamepad.png' },
  ] as HowStep[],

  levels: [
    {
      key: 'lite', tag: '● LIGHT · Стартовый', title: 'LIGHT', image: '/voxel/mug.png', accent: 'mint', baseXp: 50,
      rows: [
        { label: 'Время на выполнение', value: '≤ 1 час' },
        { label: 'За челлендж', value: '+50 XP' },
        { label: 'Дейли-бонус', value: '+10 XP' },
        { label: 'Доступен', value: 'с 1 уровня' },
      ],
    },
    {
      key: 'med', tag: '◆ MEDIUM · Основной', title: 'MEDIUM', image: '/voxel/keyboard.png', accent: 'cyan', baseXp: 150,
      rows: [
        { label: 'Время на выполнение', value: '1–4 часа' },
        { label: 'За челлендж', value: '+150 XP' },
        { label: 'Бонус за серию', value: '×2' },
        { label: 'Доступен', value: 'с 5 уровня' },
      ],
    },
    {
      key: 'hard', tag: '▲ HARD · Хардкор', title: 'HARD', image: '/voxel/note.png', accent: 'purple', baseXp: 500,
      rows: [
        { label: 'Время на выполнение', value: 'день+' },
        { label: 'За челлендж', value: '+500 XP' },
        { label: 'Эксклюзивные', value: 'ачивки' },
        { label: 'Доступен', value: 'с 12 уровня' },
      ],
    },
  ] as ChallengeLevel[],

  badges: [
    { symbol: '★', label: 'Первый шаг', got: true, accent: 'mint' },
    { symbol: '⚡', label: 'Молния', got: true, accent: 'cyan' },
    { symbol: '♛', label: 'Лидер', got: true, accent: 'purple' },
    { symbol: '▲', label: '7 дней', got: true, accent: 'mint' },
    { symbol: '♥', label: 'Душа кмд', got: true, accent: 'cyan' },
    { symbol: '◉', label: 'Снайпер', got: true, accent: 'purple' },
    { symbol: '✦', label: 'Звезда', got: true, accent: 'mint' },
    { symbol: '⬡', label: 'Архитектор', got: true, accent: 'cyan' },
    { symbol: '▣', label: 'Марафон' },
    { symbol: '♞', label: 'Стратег' },
    { symbol: '✺', label: '100 задач' },
    { symbol: '◈', label: '???', locked: true },
    { symbol: '⚔', label: '???', locked: true },
    { symbol: '☄', label: '???', locked: true },
    { symbol: '⌬', label: '???', locked: true },
    { symbol: '⬢', label: '???', locked: true },
  ] as Badge[],

  achievements: [
    { icon: '⚡', title: 'Молниеносный', text: 'Закрой 3 челленджа за один день', gain: '+200', accent: 'cyan' },
    { icon: '▲', title: 'Серия из семи', text: 'Сделай дейли 7 дней подряд', gain: '+500', accent: 'mint' },
    { icon: '♛', title: 'Топ-1 недели', text: 'Возглавь рейтинг команды на 7 дней', gain: '+1k', accent: 'purple' },
    { icon: '◉', title: 'Снайпер', text: 'Сдай HARD-челлендж за полдня', gain: '+750', accent: 'cyan' },
  ] as Achievement[],

  daily: [
    { title: 'Закрой 1 LIGHT-челлендж', points: 50 },
    { title: 'Оставь ревью коллеге', points: 30 },
    { title: 'Возьми в работу MEDIUM', points: 150 },
    { title: 'Прокачай свой профиль', points: 20 },
  ] as DailyQuest[],

  // Leaderboard теперь строится из реальных users (teamRole=member),
  // отсортированных по XP. Пустой массив = «пока никого нет».
  leaderboard: [] as LeaderboardRow[],

  roles: [
    {
      key: 'member', tag: '● Участник', title: ['Берёт', 'челленджи', 'и качается'],
      description: 'Игровая роль для всех. Подбирай задачи по сложности, копи XP, открывай бейджи и поднимайся в рейтинге команды.',
      image: '/voxel/chat.png',
      bullets: [
        '<b>Берёт в работу</b> челленджи LIGHT / MEDIUM / HARD',
        'Получает <b>дейли-задания</b> каждое утро',
        'Видит <b>свой XP, серию и место в рейтинге</b>',
        '<b>Тратит баллы</b> в магазине наград',
        'Собирает <b>бейджи</b> и эксклюзивные ачивки',
      ],
    },
    {
      key: 'pm', tag: '◆ Проектный менеджер команды', title: ['Ведёт', 'свою', 'команду'],
      description: 'Работает с одной командой: распределяет задачи, подтверждает результаты, мотивирует и видит сводную аналитику.',
      image: '/voxel/note.png',
      bullets: [
        '<b>Назначает</b> челленджи участникам',
        'Подтверждает <b>сдачу результата</b>',
        'Видит <b>прогресс команды</b> в дашборде',
        'Создаёт <b>командные дейли</b>',
        'Награждает за <b>вне-системные</b> заслуги',
      ],
    },
  ] as RoleCard[],
}

/**
 * Read landing data from the Pinia store. If the store hasn't been hydrated
 * yet (CMS still loading or unreachable), returns defaults so components
 * render meaningful content immediately.
 */
export const useLandingData = () => {
  const store = useLandingStore()
  // Computed refs preserve reactivity through destructuring; Vue templates
  // auto-unwrap them, so existing `v-for`s keep working as-is.
  return {
    heroStats:    computed(() => store.heroStats.length    ? store.heroStats    : landingDefaults.heroStats),
    howSteps:     computed(() => store.howSteps.length     ? store.howSteps     : landingDefaults.howSteps),
    levels:       computed(() => store.levels.length       ? store.levels       : landingDefaults.levels),
    badges:       computed(() => store.badges.length       ? store.badges       : landingDefaults.badges),
    achievements: computed(() => store.achievements.length ? store.achievements : landingDefaults.achievements),
    daily:        computed(() => store.daily.length        ? store.daily        : landingDefaults.daily),
    leaderboard:  computed(() => store.leaderboard.length  ? store.leaderboard  : landingDefaults.leaderboard),
    roles:        computed(() => store.roles.length        ? store.roles        : landingDefaults.roles),
    source:       computed(() => store.source),
    loaded:       computed(() => store.loaded),
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Strapi fetch — called from pages/index.vue via useAsyncData
// ────────────────────────────────────────────────────────────────────────────

export const useStrapiLanding = async () => {
  const store = useLandingStore()
  if (store.loaded) return // already hydrated this session

  const mediaFn = useStrapiMedia()
  const media = (url: unknown, fallback: string): string =>
    typeof url === 'string' && url.length > 0 ? (mediaFn(url) as string) : fallback

  const { find, findOne } = useStrapi()

  type One<T> = { data: T | null }
  type Many<T> = { data: T[] }

  const safe = async <T,>(fn: () => Promise<T>): Promise<T | null> => {
    try { return await fn() } catch { return null }
  }

  // Leaderboard now lives on the User table: members only, top XP.
  // We use $fetch directly because @nuxtjs/strapi's `useStrapi().find('users', ...)`
  // double-paginates the users-permissions endpoint.
  const strapiUrl = (useRuntimeConfig().public as any)?.strapi?.url ?? 'http://localhost:1337'
  const token = useStrapiToken().value

  const fetchTopMembers = async () =>
    $fetch<any[]>(`${strapiUrl}/api/users`, {
      params: {
        'filters[teamRole][$eq]': 'member',
        'sort[0]': 'xp:desc',
        'pagination[limit]': 10,
        // explicit fields to avoid leaking unrelated columns
        'fields[0]': 'id',
        'fields[1]': 'username',
        'fields[2]': 'displayName',
        'fields[3]': 'team',
        'fields[4]': 'teamRole',
        'fields[5]': 'xp',
        'fields[6]': 'level',
        'fields[7]': 'challengesClosed',
      },
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })

  const [hero, steps, levels, badges, achievements, daily, topMembers, roles] = await Promise.all([
    safe(() => findOne<One<any>>('hero', { populate: ['stats'] })),
    safe(() => find<Many<any>>('how-steps', { populate: ['icon'], sort: 'order:asc' })),
    safe(() => find<Many<any>>('challenge-levels', { populate: ['rows', 'image'], sort: 'order:asc' })),
    safe(() => find<Many<any>>('badges', { sort: 'order:asc' })),
    safe(() => find<Many<any>>('achievements', { sort: 'order:asc' })),
    safe(() => find<Many<any>>('daily-quests', { sort: 'order:asc' })),
    safe(fetchTopMembers),
    safe(() => find<Many<any>>('role-cards', { populate: ['image'], sort: 'order:asc' })),
  ])

  const out: Partial<Parameters<typeof store.hydrate>[0]> = { source: 'defaults' }

  if (hero?.data?.stats?.length) {
    out.heroStats = hero.data.stats.map((s: any) => ({
      value: s.value, label: s.label, accent: accentFor(s.accent),
    }))
  }

  if (steps?.data?.length) {
    out.howSteps = steps.data.map((s: any) => ({
      n: s.number,
      title: s.title,
      text: s.text,
      icon: media(s.icon?.url, '/voxel/keycaps.png'),
    }))
  }

  if (levels?.data?.length) {
    out.levels = levels.data.map((l: any) => ({
      key: l.key,
      tag: l.tag,
      title: l.title,
      accent: accentFor(l.accent),
      baseXp: l.baseXp,
      image: media(l.image?.url, '/voxel/mug.png'),
      rows: (l.rows ?? []).map((r: any) => ({ label: r.label, value: r.value })),
    }))
  }

  if (badges?.data?.length) {
    out.badges = badges.data.map((b: any) => ({
      symbol: b.symbol,
      label: b.label,
      accent: accentFor(b.accent),
      got: !!b.got,
      locked: !!b.locked,
    }))
  }

  if (achievements?.data?.length) {
    out.achievements = achievements.data.map((a: any) => ({
      icon: a.icon, title: a.title, text: a.text, gain: a.gain, accent: accentFor(a.accent),
    }))
  }

  if (daily?.data?.length) {
    out.daily = daily.data.map((q: any) => ({
      id: q.id, title: q.title, points: q.points,
    }))
  }

  // Build leaderboard from real members. Skips PMs by query (teamRole=member).
  // The current user's row is injected by SectionLeaderboard from useStrapiUser().
  if (Array.isArray(topMembers) && topMembers.length) {
    const palette = [
      'linear-gradient(135deg, #18EFF2, #52F2C5)',
      'linear-gradient(135deg, #52F2C5, #18EFF2)',
      'linear-gradient(135deg, #B559F3, #18EFF2)',
      'linear-gradient(135deg, #ff7a7a, #B559F3)',
      'linear-gradient(135deg, #52F2C5, #7bff7a)',
      'linear-gradient(135deg, #18EFF2, #B559F3)',
    ]
    out.leaderboard = topMembers.map((u: any, idx: number) => {
      const name = u.displayName || u.username || 'Игрок'
      const xp = Number(u.xp ?? 0)
      const closed = Number(u.challengesClosed ?? 0)
      return {
        rank: idx + 1,
        userId: u.id,
        name,
        team: u.team ? `${u.team} · участник` : 'без команды',
        level: `LVL ${u.level ?? 1}`,
        closed: `${closed} закрыто`,
        xp: xp.toLocaleString('ru-RU').replace(/,/g, ' '),
        gradient: palette[idx % palette.length],
        initial: (name[0] ?? '?').toUpperCase(),
      } as LeaderboardRow
    })
  }

  if (roles?.data?.length) {
    out.roles = roles.data.map((r: any) => ({
      key: r.key,
      tag: r.tag,
      title: String(r.title ?? '').split(/\r?\n/).filter(Boolean),
      description: r.description,
      bullets: Array.isArray(r.bullets) ? r.bullets : [],
      image: media(r.image?.url, '/voxel/chat.png'),
    }))
  }

  if (Object.keys(out).length > 1) out.source = 'cms'
  store.hydrate(out)
}
