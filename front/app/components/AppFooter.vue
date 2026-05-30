<script setup lang="ts">
const cols = [
  {
    title: 'Платформа',
    links: [
      { href: '#how', label: 'Как это работает' },
      { href: '#levels', label: 'Уровни' },
      { href: '#achievements', label: 'Достижения' },
      { href: '#leaderboard', label: 'Рейтинг' },
    ],
  },
  {
    title: 'Для команд',
    links: [
      { href: '#roles', label: 'Админам' },
      { href: '#roles', label: 'Проектным менеджерам' },
      { href: '#', label: 'Подключить команду' },
      { href: '#', label: 'API · документация' },
    ],
  },
  {
    title: 'Контакты',
    links: [
      { href: '#', label: 'support@fabrika.ru' },
      { href: '#', label: 'Telegram' },
      { href: '#', label: 'Сообщить об ошибке' },
    ],
  },
]
</script>

<template>
  <footer class="border-t border-line pt-15 pb-10 mt-15">
    <div class="max-w-[1320px] mx-auto px-8">
      <div class="grid grid-cols-1 md:grid-cols-[1.5fr_1fr_1fr_1fr] gap-10 mb-12">
        <div>
          <img src="/voxel/logo.png" alt="Фабрика решений" class="logo-mark h-[30px] [image-rendering:pixelated] mb-4" />
          <p class="text-[13px] text-ink-3 max-w-[320px] leading-[1.55]">
            Платформа геймификации для команд. Челленджи, уровни, рейтинг и магазин наград — всё в одном окне.
          </p>
        </div>
        <div v-for="c in cols" :key="c.title">
          <h5 class="font-mono text-[11px] tracking-[0.14em] text-ink-3 uppercase m-0 mb-[18px]">{{ c.title }}</h5>
          <a v-for="l in c.links" :key="l.label" :href="l.href" class="block text-sm text-ink-2 py-1.5 hover:text-cyan-brand">
            {{ l.label }}
          </a>
        </div>
      </div>
      <div class="flex justify-between items-center pt-6 border-t border-line font-mono text-[11px] tracking-[0.08em] text-ink-3 uppercase flex-wrap gap-4">
        <span>© 2026 Фабрика решений</span>
        <div class="flex gap-5 items-center">
          <span class="text-ink-3 tracking-[0.1em]">Часть экосистемы</span>
          <img src="/voxel/school21.png" alt="Школа 21" class="logo-mark h-[26px]" />
        </div>
      </div>
    </div>
  </footer>
</template>
