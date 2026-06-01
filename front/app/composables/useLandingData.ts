import { computed } from 'vue'
import type {
  Accent,
  Badge,
  ChallengeLevel,
  ChallengeTask,
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
    { value: '0', label: 'команд в рейтинге', accent: 'purple' },
    { value: '0', label: 'участников в командах', accent: 'cyan' },
    { value: '0', label: 'челленджей закрыто', accent: 'mint' },
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
    { label: 'Первый шаг', accent: 'mint', conditionType: 'first_light_challenge', conditionValue: 0 },
    { label: '5 уровень', accent: 'purple', conditionType: 'reach_level', conditionValue: 5 },
    { label: 'Дисциплина', accent: 'cyan', conditionType: 'complete_dailies', conditionValue: 10 },
    { label: '7 дней', accent: 'mint', conditionType: 'streak_days', conditionValue: 7 },
    { label: 'Снайпер', accent: 'purple', conditionType: 'first_hard_challenge', conditionValue: 0 },
  ] as Badge[],

  daily: [
    { title: 'Закрой 1 LIGHT-челлендж', points: 50, description: 'Выбери любой челлендж уровня LIGHT и доведи его до сдачи. Лёгкая задача на 15–60 минут, чтобы поддержать дейли-серию и быстро забрать опыт.' },
    { title: 'Оставь ревью коллеге', points: 30, description: 'Зайди в работу любого участника команды и оставь содержательный комментарий: что хорошо, что можно улучшить. Ревью помогает команде расти, а тебе — очки.' },
    { title: 'Возьми в работу MEDIUM', points: 150, description: 'Закрепи за собой челлендж уровня MEDIUM. Не обязательно сдавать сегодня — достаточно взять задачу в работу и начать.' },
    { title: 'Прокачай свой профиль', points: 20, description: 'Загрузи аватар, проверь команду и роль. Заполненный профиль виден в рейтинге и команде.' },
  ] as DailyQuest[],

  challenges: [
    { level: 'light', xp: 50, title: 'Закрой LIGHT-челлендж', description: 'Лёгкая задача на 15–60 минут. Идеально, чтобы поддержать серию и быстро забрать опыт.' },
    { level: 'light', xp: 50, title: 'Наведи порядок в своей доске задач', description: 'Разбери карточки, закрой завершённое, расставь приоритеты на сегодня.' },
    { level: 'medium', xp: 150, title: 'Возьми и сдай MEDIUM-челлендж', description: 'Задача на 1–4 часа. Требует погружения, но и опыта даёт втрое больше лёгкой.' },
    { level: 'medium', xp: 150, title: 'Сделай ревью pull request коллеги', description: 'Внимательно посмотри изменения, оставь конструктивные комментарии и одобри либо запроси правки.' },
    { level: 'hard', xp: 500, title: 'Закрой HARD-челлендж', description: 'Хардкорная задача на день и больше. Максимум опыта и эксклюзивные ачивки.' },
    { level: 'hard', xp: 500, title: 'Спроектируй и презентуй фичу команде', description: 'Продумай архитектуру, оформи решение и защити его перед командой.' },
  ] as ChallengeTask[],

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
        'Собирает <b>бейджи</b>',
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
    challenges:   computed(() => store.loaded ? store.challenges : landingDefaults.challenges),
    badges:       computed(() => store.badges.length       ? store.badges       : landingDefaults.badges),
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

  // Build absolute media URLs ourselves. useStrapiMedia() is unreliable in this
  // @nuxtjs/strapi version (it isn't callable and throws), and a throw inside the
  // mapping below aborts the entire landing hydration — which is exactly what hid
  // every CMS image (badges included).
  const strapiMediaBase = (useRuntimeConfig().public as any)?.strapi?.url ?? 'http://localhost:1337'
  const toMediaUrl = (url: string): string =>
    /^https?:\/\//.test(url) ? url : `${strapiMediaBase}${url.startsWith('/') ? '' : '/'}${url}`
  const media = (url: unknown, fallback: string): string =>
    typeof url === 'string' && url.length > 0 ? toMediaUrl(url) : fallback

  const { find } = useStrapi()

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
        'fields[3]': 'teamRole',
        'fields[4]': 'xp',
        'fields[5]': 'level',
        'fields[6]': 'challengesClosed',
        // current daily streak — used by the "по стрику" leaderboard sort
        'fields[7]': 'streak',
        // profileHeader (json) drives the customized rank tile when no avatar
        'fields[8]': 'profileHeader',
        // team is now a relation — pull just its name for display
        'populate[team][fields][0]': 'name',
        // uploaded avatar for the customized profile tile
        'populate[avatar][fields][0]': 'url',
      },
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })

  const fetchChallenges = async () =>
    $fetch<Many<any>>(`${strapiUrl}/api/challenges`, {
      params: { 'sort[0]': 'order:asc' },
    })

  // Total number of teams — read from pagination meta (pageSize=1 keeps it cheap).
  // Requires `api::team.team.find` for the authenticated role (see cms/src/index.ts).
  // If that grant is missing the call 403s, and we fall back to the distinct-team
  // count derived from members below.
  const fetchTeamsTotal = async () =>
    $fetch<{ meta?: { pagination?: { total?: number } } }>(`${strapiUrl}/api/teams`, {
      params: { 'fields[0]': 'id', 'pagination[pageSize]': 1 },
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })

  // Every member that belongs to a team (PMs are excluded — they own a team via
  // managedTeam but aren't participants). Drives three hero stats:
  //   • participant count       (array length)
  //   • teams (fallback)        (distinct team ids)
  //   • total challenges closed (sum of challengesClosed)
  // pagination[limit]=-1 lifts the users-permissions default page cap.
  const fetchTeamMembers = async () =>
    $fetch<any[]>(`${strapiUrl}/api/users`, {
      params: {
        'filters[teamRole][$eq]': 'member',
        'fields[0]': 'id',
        'fields[1]': 'challengesClosed',
        'populate[team][fields][0]': 'id',
        'pagination[limit]': -1,
      },
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })

  // NOTE: @nuxtjs/strapi's useStrapi().find() with a `populate` option returns
  // empty here (the populated relations come back unpopulated/blank), which
  // silently drops CMS images and falls back to defaults. We fetch the
  // collections that need populated media via $fetch directly — same proven
  // path as challenges/leaderboard — so images actually arrive.
  const fetchMany = (path: string, params: Record<string, string>) =>
    $fetch<Many<any>>(`${strapiUrl}/api/${path}`, { params })

  const [steps, levels, challenges, badges, daily, topMembers, roles, teamsTotalRes, teamMembers] = await Promise.all([
    safe(() => fetchMany('how-steps', { 'populate[0]': 'icon', 'sort[0]': 'order:asc' })),
    safe(() => fetchMany('challenge-levels', { 'populate[0]': 'rows', 'populate[1]': 'image', 'sort[0]': 'order:asc' })),
    safe(fetchChallenges),
    safe(() => fetchMany('badges', { 'populate[0]': 'image', 'sort[0]': 'order:asc' })),
    safe(() => find<Many<any>>('daily-quests', { sort: 'order:asc' })),
    safe(fetchTopMembers),
    safe(() => fetchMany('role-cards', { 'populate[0]': 'image', 'sort[0]': 'order:asc' })),
    safe(fetchTeamsTotal),
    safe(fetchTeamMembers),
  ])

  const out: Partial<Parameters<typeof store.hydrate>[0]> = { source: 'defaults' }

  // Hero stats — computed live from real data:
  //   • total teams           (teams pagination meta)
  //   • participants in a team (users with a team relation)
  //   • challenges closed      (sum of challengesClosed over those participants)
  const fmtNum = (n: number) => n.toLocaleString('ru-RU').replace(/,/g, ' ')
  // Keep only members actually attached to a team ("только которые в команде").
  // The custom users `find` controller flattens the relation to `{ name }` (no id).
  const members = (Array.isArray(teamMembers) ? teamMembers : []).filter((m: any) => m.team?.name)
  if (teamsTotalRes || members.length) {
    const participants = members.length
    const challengesClosed = members.reduce((sum, m: any) => sum + Number(m.challengesClosed ?? 0), 0)
    // Prefer the exact teams total; if the teams endpoint was forbidden, fall back
    // to the number of distinct teams the members actually belong to.
    const metaTotal = Number(teamsTotalRes?.meta?.pagination?.total ?? 0)
    const distinctTeams = new Set(members.map((m: any) => m.team?.name).filter(Boolean)).size
    const teamsTotal = metaTotal || distinctTeams
    out.heroStats = [
      { value: fmtNum(teamsTotal), label: 'команд в рейтинге', accent: 'purple' },
      { value: fmtNum(participants), label: 'участников в командах', accent: 'cyan' },
      { value: fmtNum(challengesClosed), label: 'челленджей закрыто', accent: 'mint' },
    ]
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
      id: b.id,
      code: typeof b.code === 'string' ? b.code : undefined,
      label: b.label,
      image: b.image?.url ? toMediaUrl(b.image.url) : undefined,
      accent: accentFor(b.accent),
      // `got` is per-user, computed in SectionAchievements from the user's
      // earnedBadges — the badge's own `got` flag is only a CMS preview default.
      locked: !!b.locked,
      conditionType: b.conditionType ?? 'none',
      conditionValue: Number(b.conditionValue ?? 0),
      xpReward: Number(b.xpReward ?? 0),
      rewardImage: typeof b.rewardImage === 'string' && b.rewardImage ? b.rewardImage : null,
    }))
  }

  if (daily?.data?.length) {
    out.daily = daily.data.map((q: any) => ({
      id: q.id, title: q.title, description: q.description, points: q.points,
    }))
  }

  if (Array.isArray(challenges?.data)) {
    out.challenges = challenges.data.map((c: any) => ({
      id: c.id,
      title: c.title,
      description: c.description,
      level: (['light', 'medium', 'hard'].includes(c.level) ? c.level : 'light') as ChallengeTask['level'],
      xp: Number(c.xp ?? 0),
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
      const streak = Number(u.streak ?? 0)
      const ph = u.profileHeader && typeof u.profileHeader === 'object' ? u.profileHeader : null
      return {
        rank: idx + 1,
        userId: u.id,
        name,
        team: u.team?.name ? `${u.team.name} · участник` : 'без команды',
        level: `LVL ${u.level ?? 1}`,
        closed: `${closed} закрыто`,
        xp: xp.toLocaleString('ru-RU').replace(/,/g, ' '),
        xpValue: xp,
        closedValue: closed,
        streak,
        gradient: palette[idx % palette.length],
        initial: (name[0] ?? '?').toUpperCase(),
        avatarUrl: u.avatar?.url ? toMediaUrl(u.avatar.url) : null,
        headerColor: typeof ph?.color === 'string' ? ph.color : null,
        headerImage: typeof ph?.image === 'string' && ph.image ? ph.image : null,
        headerImageX: Number.isFinite(ph?.imageX) ? ph.imageX : 50,
        headerImageY: Number.isFinite(ph?.imageY) ? ph.imageY : 50,
        headerImageSize: Number.isFinite(ph?.imageSize) ? ph.imageSize : 100,
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
