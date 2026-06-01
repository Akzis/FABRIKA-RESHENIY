import process from 'node:process'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  modules: [
    '@nuxt/ui',
    '@vueuse/nuxt',
    '@pinia/nuxt',
    '@nuxtjs/strapi',
  ],

  css: ['driver.js/dist/driver.css', '@/assets/css/main.css'],

  app: {
    head: {
      htmlAttrs: { lang: 'ru' },
      title: 'Фабрика решений — платформа геймификации',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: 'Платформа геймификации для команд. Челленджи, уровни, рейтинг и магазин наград.' },
      ],
      link: [
        // SB Sans Display Semibold (брендовый шрифт ФР, self-hosted).
        // Чтобы откатиться на Manrope — поправь --font-sans в main.css,
        // этот preload можно оставить или убрать.
        {
          rel: 'preload',
          href: '/fonts/sb-sans-display-semibold.ttf',
          as: 'font',
          type: 'font/ttf',
          crossorigin: '',
        },
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        {
          // Manrope остаётся как fallback и как «откат-вариант».
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Pixelify+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap',
        },
      ],
      script: [
        {
          // Pre-paint theme to avoid a flash. Mirrors stores/theme.ts detection.
          innerHTML: `(function(){try{var k='fr-theme';var s=localStorage.getItem(k);var m=window.matchMedia('(prefers-color-scheme: light)').matches;var t=s==='light'||s==='dark'?s:(m?'light':'dark');document.documentElement.setAttribute('data-theme',t);}catch(e){}})();`,
          type: 'text/javascript',
          tagPosition: 'head',
        },
      ],
    },
  },

  ui: {
    fonts: false,
  },

  strapi: {
    url: process.env.STRAPI_URL ?? 'http://localhost:1337',
    admin: process.env.STRAPI_ADMIN ?? '/admin',
    prefix: process.env.STRAPI_API_PREFIX ?? '/api',
    version: 'v5',
  },

  pinia: {
    storesDirs: ['./stores/**'],
  },

  components: {
    dirs: [
      {
        path: '@/components',
        pathPrefix: false,
      },
    ],
  },
})
