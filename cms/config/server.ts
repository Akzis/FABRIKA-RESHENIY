import type { Core } from '@strapi/strapi';

const config = ({ env }: Core.Config.Shared.ConfigParams): Core.Config.Server => ({
  host: env('HOST', '0.0.0.0'),
  port: env.int('PORT', 1337),
  app: {
    keys: env.array('APP_KEYS'),
  },
  // Enables programmatic cron jobs (strapi.cron.add) — used to rotate the
  // daily quests forward each day (see src/index.ts).
  cron: { enabled: true },
});

export default config;
