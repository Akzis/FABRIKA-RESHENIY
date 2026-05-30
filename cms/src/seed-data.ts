/**
 * Seed payload for the landing CMS. Inserted by bootstrap() on first start
 * if the corresponding collection is empty. Keep this in sync with the
 * defaults in front/app/composables/useLandingData.ts.
 */

export const seedHero = {
  eyebrow: 'Платформа геймификации',
  titleLine1: 'Качай скилл.',
  titleLine2: 'Бери челлендж.',
  titleLine3: 'Получай награду.',
  lede:
    'Превращаем рабочие задачи в игру с уровнями LIGHT, MEDIUM и HARD. Команды выполняют челленджи, копят баллы и поднимаются по рейтингу — а вы видите прогресс в реальном времени.',
  ctaPrimary: 'К моему дашборду',
  ctaSecondary: 'Как это работает',
  stats: [
    { value: '1 240', label: 'игроков на платформе', accent: 'cyan' },
    { value: '87k', label: 'челленджей закрыто', accent: 'mint' },
    { value: '42', label: 'команды в рейтинге', accent: 'purple' },
  ],
}

export const seedHowSteps = [
  { order: 1, number: '01', title: 'Выбираешь\nчеллендж', text: 'Выбирай по сложности или подходящей теме. Дейли-задания обновляются каждый день в 9:00.' },
  { order: 2, number: '02', title: 'Берёшь\nв работу', text: 'Закрепляешь задачу за собой. Команда видит твой прогресс и может подключиться к коллабу.' },
  { order: 3, number: '03', title: 'Сдаёшь\nрезультат', text: 'Прикладываешь решение, проектный менеджер ставит ✓. Опыт начисляется автоматически.' },
  { order: 4, number: '04', title: 'Забираешь\nнаграду', text: 'Тратишь баллы в магазине: мерч, кастомизация профиля, статус, бонусы и эксклюзивные ачивки.' },
]

export const seedLevels = [
  {
    order: 1, key: 'lite', tag: '● LIGHT · Стартовый', title: 'LIGHT', accent: 'mint', baseXp: 50,
    rows: [
      { label: 'Время на выполнение', value: '≤ 1 час' },
      { label: 'За челлендж', value: '+50 XP' },
      { label: 'Дейли-бонус', value: '+10 XP' },
      { label: 'Доступен', value: 'с 1 уровня' },
    ],
  },
  {
    order: 2, key: 'med', tag: '◆ MEDIUM · Основной', title: 'MEDIUM', accent: 'cyan', baseXp: 150,
    rows: [
      { label: 'Время на выполнение', value: '1–4 часа' },
      { label: 'За челлендж', value: '+150 XP' },
      { label: 'Бонус за серию', value: '×2' },
      { label: 'Доступен', value: 'с 5 уровня' },
    ],
  },
  {
    order: 3, key: 'hard', tag: '▲ HARD · Хардкор', title: 'HARD', accent: 'purple', baseXp: 500,
    rows: [
      { label: 'Время на выполнение', value: 'день+' },
      { label: 'За челлендж', value: '+500 XP' },
      { label: 'Эксклюзивные', value: 'ачивки' },
      { label: 'Доступен', value: 'с 12 уровня' },
    ],
  },
]

export const seedBadges = [
  { order: 1, symbol: '★', label: 'Первый шаг', got: true, accent: 'mint' },
  { order: 2, symbol: '⚡', label: 'Молния', got: true, accent: 'cyan' },
  { order: 3, symbol: '♛', label: 'Лидер', got: true, accent: 'purple' },
  { order: 4, symbol: '▲', label: '7 дней', got: true, accent: 'mint' },
  { order: 5, symbol: '♥', label: 'Душа кмд', got: true, accent: 'cyan' },
  { order: 6, symbol: '◉', label: 'Снайпер', got: true, accent: 'purple' },
  { order: 7, symbol: '✦', label: 'Звезда', got: true, accent: 'mint' },
  { order: 8, symbol: '⬡', label: 'Архитектор', got: true, accent: 'cyan' },
  { order: 9, symbol: '▣', label: 'Марафон', got: false, accent: 'cyan' },
  { order: 10, symbol: '♞', label: 'Стратег', got: false, accent: 'cyan' },
  { order: 11, symbol: '✺', label: '100 задач', got: false, accent: 'cyan' },
  { order: 12, symbol: '◈', label: '???', locked: true, accent: 'cyan' },
  { order: 13, symbol: '⚔', label: '???', locked: true, accent: 'cyan' },
  { order: 14, symbol: '☄', label: '???', locked: true, accent: 'cyan' },
  { order: 15, symbol: '⌬', label: '???', locked: true, accent: 'cyan' },
  { order: 16, symbol: '⬢', label: '???', locked: true, accent: 'cyan' },
]

export const seedAchievements = [
  { order: 1, icon: '⚡', title: 'Молниеносный', text: 'Закрой 3 челленджа за один день', gain: '+200', accent: 'cyan' },
  { order: 2, icon: '▲', title: 'Серия из семи', text: 'Сделай дейли 7 дней подряд', gain: '+500', accent: 'mint' },
  { order: 3, icon: '♛', title: 'Топ-1 недели', text: 'Возглавь рейтинг команды на 7 дней', gain: '+1k', accent: 'purple' },
  { order: 4, icon: '◉', title: 'Снайпер', text: 'Сдай HARD-челлендж за полдня', gain: '+750', accent: 'cyan' },
]

// Daily quests are global templates. Per-user "done" comes from
// User.completedDailyQuests relation — there's no `done` flag on the quest.
export const seedDaily = [
  { order: 1, title: 'Закрой 1 LIGHT-челлендж', points: 50 },
  { order: 2, title: 'Оставь ревью коллеге', points: 30 },
  { order: 3, title: 'Возьми в работу MEDIUM', points: 150 },
  { order: 4, title: 'Прокачай свой профиль', points: 20 },
]

export const seedRoles = [
  {
    order: 1, key: 'member', tag: '● Участник', title: 'Берёт\nчелленджи\nи качается',
    description: 'Игровая роль для всех. Подбирай задачи по сложности, копи XP, открывай бейджи и поднимайся в рейтинге команды.',
    bullets: [
      '<b>Берёт в работу</b> челленджи LIGHT / MEDIUM / HARD',
      'Получает <b>дейли-задания</b> каждое утро',
      'Видит <b>свой XP, серию и место в рейтинге</b>',
      '<b>Тратит баллы</b> в магазине наград',
      'Собирает <b>бейджи</b> и эксклюзивные ачивки',
    ],
  },
  {
    order: 2, key: 'pm', tag: '◆ Проектный менеджер команды', title: 'Ведёт\nсвою\nкоманду',
    description: 'Работает с одной командой: распределяет задачи, подтверждает результаты, мотивирует и видит сводную аналитику.',
    bullets: [
      '<b>Назначает</b> челленджи участникам',
      'Подтверждает <b>сдачу результата</b>',
      'Видит <b>прогресс команды</b> в дашборде',
      'Создаёт <b>командные дейли</b>',
      'Награждает за <b>вне-системные</b> заслуги',
    ],
  },
]
