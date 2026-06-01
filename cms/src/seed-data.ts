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

// `code` is a stable id used by the awarding logic; `conditionType` +
// `conditionValue` describe how a badge is unlocked automatically
// (see awardBadges() in extensions/users-permissions/strapi-server.ts).
// Badges with conditionType 'none' are awarded manually (secret / locked).
// `xpReward` — XP granted the moment the badge is earned.
// `rewardImage` — a profile-header picture this badge unlocks. Profile pictures
// can ONLY be obtained by earning badges; everyone starts with STARTER_PROFILE_IMAGE.
export const STARTER_PROFILE_IMAGE = '/voxel/dino.png'
export const seedBadges = [
  { order: 1, code: 'first-light', label: 'Первый шаг', accent: 'mint', conditionType: 'first_light_challenge', conditionValue: 0, xpReward: 100, rewardImage: '/voxel/keycaps.png' },
  { order: 2, code: 'level-5', label: '5 уровень', accent: 'purple', conditionType: 'reach_level', conditionValue: 5, xpReward: 200, rewardImage: '/voxel/gamepad.png' },
  { order: 3, code: 'dailies-10', label: 'Дисциплина', accent: 'cyan', conditionType: 'complete_dailies', conditionValue: 10, xpReward: 150, rewardImage: '/voxel/notepad.png' },
  { order: 4, code: 'streak-7', label: '7 дней', accent: 'mint', conditionType: 'streak_days', conditionValue: 7, xpReward: 250, rewardImage: '/voxel/arrow.png' },
  { order: 5, code: 'first-hard', label: 'Снайпер', accent: 'purple', conditionType: 'first_hard_challenge', conditionValue: 0, xpReward: 500, rewardImage: '/voxel/mug.png' },
]

// Daily quests are global templates. Per-user "done" comes from
// User.completedDailyQuests relation — there's no `done` flag on the quest.
export const seedDaily = [
  { order: 1, title: 'Закрой 1 LIGHT-челлендж', points: 50, description: 'Выбери любой челлендж уровня LIGHT и доведи его до сдачи. Лёгкая задача на 15–60 минут, чтобы поддержать дейли-серию и быстро забрать опыт.' },
  { order: 2, title: 'Оставь ревью коллеге', points: 30, description: 'Зайди в работу любого участника команды и оставь содержательный комментарий: что хорошо, что можно улучшить. Ревью помогает команде расти, а тебе — очки.' },
  { order: 3, title: 'Возьми в работу MEDIUM', points: 150, description: 'Закрепи за собой челлендж уровня MEDIUM. Не обязательно сдавать сегодня — достаточно взять задачу в работу и начать.' },
  { order: 4, title: 'Прокачай свой профиль', points: 20, description: 'Загрузи аватар, проверь команду и роль. Заполненный профиль виден в рейтинге и команде.' },
]

// Challenges the participant can complete. Level drives the filter tabs in
// the "Задания" section; xp is awarded on completion.
export const seedChallenges = [
  { order: 1, level: 'light', xp: 50, title: 'Закрой LIGHT-челлендж', description: 'Лёгкая задача на 15–60 минут. Идеально, чтобы поддержать серию и быстро забрать опыт.' },
  { order: 2, level: 'light', xp: 50, title: 'Наведи порядок в своей доске задач', description: 'Разбери карточки, закрой завершённое, расставь приоритеты на сегодня.' },
  { order: 3, level: 'medium', xp: 150, title: 'Возьми и сдай MEDIUM-челлендж', description: 'Задача на 1–4 часа. Требует погружения, но и опыта даёт втрое больше лёгкой.' },
  { order: 4, level: 'medium', xp: 150, title: 'Сделай ревью pull request коллеги', description: 'Внимательно посмотри изменения, оставь конструктивные комментарии и одобри либо запроси правки.' },
  { order: 5, level: 'hard', xp: 500, title: 'Закрой HARD-челлендж', description: 'Хардкорная задача на день и больше. Максимум опыта и эксклюзивные ачивки.' },
  { order: 6, level: 'hard', xp: 500, title: 'Спроектируй и презентуй фичу команде', description: 'Продумай архитектуру, оформи решение и защити его перед командой.' },
]

export const seedShopItems = [
  {
    order: 1,
    slug: 'keychain-dino',
    title: 'Воксельный брелок',
    description: 'Фирменный мини-динозавр для ключей или рюкзака.',
    price: 180,
    image: '/voxel/dino.png',
    tag: 'мерч',
    isActive: true,
  },
  {
    order: 2,
    slug: 'stickerpack',
    title: 'Стикерпак',
    description: 'Набор наклеек с иконками Фабрики решений.',
    price: 120,
    image: '/voxel/chat.png',
    tag: 'быстро',
    isActive: true,
  },
  {
    order: 3,
    slug: 'mug',
    title: 'Кружка',
    description: 'Кружка для кофе, чая и сложных дейли-челленджей.',
    price: 420,
    image: '/voxel/mug.png',
    tag: 'хит',
    isActive: true,
  },
  {
    order: 4,
    slug: 'notepad',
    title: 'Блокнот',
    description: 'Для идей, схем и планов на следующий спринт.',
    price: 260,
    image: '/voxel/notepad.png',
    tag: 'офис',
    isActive: true,
  },
  {
    order: 5,
    slug: 'keycaps',
    title: 'Кейкапы',
    description: 'Акцентные клавиши для тех, кто закрыл хард.',
    price: 650,
    image: '/voxel/keycaps.png',
    tag: 'rare',
    isActive: true,
  },
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
      'Собирает <b>бейджи</b>',
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
