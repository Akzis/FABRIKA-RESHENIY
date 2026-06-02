# Фабрика решений

Платформа геймификации для команд: челленджи, уровни, рейтинг, ачивки и магазин наград. Сотрудники выполняют задания, прокачивают уровни и тратят заработанные баллы в магазине.

Проект состоит из двух частей:

| Папка   | Что это                  | Стек                                            |
| ------- | ------------------------ | ----------------------------------------------- |
| `front` | Веб-приложение (SPA/SSR) | Nuxt 4, Vue 3, Nuxt UI 4, Pinia, GSAP, driver.js |
| `cms`   | Бэкенд и админка         | Strapi 5, SQLite (better-sqlite3), TypeScript    |

## Возможности

- **Челленджи и уровни** — задания с уровнями сложности и проверкой решений (`challenge`, `challenge-level`, `challenge-submission`).
- **Ежедневные квесты** (`daily-quest`) и лента активности (`activity-event`).
- **Рейтинг и команды** — лидерборд, ростер команды (`team`, `SectionLeaderboard`, `SectionTeamRoster`).
- **Ачивки и бейджи** (`badge`, `SectionAchievements`).
- **Магазин наград** — товары и заказы за баллы (`shop-item`, `shop-order`).
- **Роли** (`role-card`) и онбординг-тур по интерфейсу (driver.js).
- Тёмная/светлая тема без мерцания, брендовый шрифт SB Sans Display.

## Требования

- Node.js `>=20 <=24` (для CMS); фронтенд собирается под Node 25 в Docker.
- npm

## Быстрый старт

### 1. CMS (Strapi)

```bash
cd cms
cp .env.example .env   # заполните секреты (APP_KEYS, JWT_SECRET и т.д.)
npm install
npm run develop        # админка на http://localhost:1337/admin
```

При первом запуске Strapi предложит создать администратора. Затем в **Settings → API Tokens** создайте токен для доступа фронтенда (если нужен приватный контент).

### 2. Фронтенд (Nuxt)

```bash
cd front
npm install
npm run dev            # http://localhost:3000
```

Конфигурация подключения к Strapi — в `front/.env`:

```env
NITRO_PORT = 4000
FRONTEND_EXTERNAL_PORT = 3000
# STRAPI_URL = 'http://localhost:1337'
# STRAPI_TOKEN = ''
```

URL Strapi также можно переопределить переменными `STRAPI_URL`, `STRAPI_ADMIN`, `STRAPI_API_PREFIX` (см. `front/nuxt.config.ts`).

## Сборка для продакшена

**CMS:**

```bash
cd cms
npm run build
npm run start
```

**Фронтенд:**

```bash
cd front
npm run build
node .output/server/index.mjs
```

Либо через Docker:

```bash
cd front
docker compose up --build
```

## Структура фронтенда

```
front/app/
├── components/   # секции лендинга и UI (Section*, App*, Base*)
├── pages/        # маршруты (index.vue)
├── stores/       # Pinia: landing.ts, theme.ts
├── composables/  # переиспользуемая логика
├── layouts/      # макеты страниц
└── assets/       # стили и шрифты
```

## Полезные команды

| Команда (в `cms`)   | Действие                       |
| ------------------- | ------------------------------ |
| `npm run develop`   | Запуск Strapi с автоперезагрузкой |
| `npm run build`     | Сборка админки                 |
| `npm run start`     | Запуск собранного приложения   |
| `npm run upgrade`   | Обновление Strapi до latest    |

| Команда (в `front`) | Действие                       |
| ------------------- | ------------------------------ |
| `npm run dev`       | Дев-сервер Nuxt                |
| `npm run build`     | Продакшен-сборка               |
| `npm run generate`  | Генерация статики              |
| `npm run preview`   | Превью собранного приложения   |
