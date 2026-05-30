<script setup lang="ts">
import { computed } from 'vue'
import { useThemeStore } from '~/stores/theme'

const theme = useThemeStore()

const label = computed(() => theme.theme === 'dark' ? 'Светлая тема' : 'Тёмная тема')
const icon = computed(() => theme.theme === 'dark' ? '☀' : '☾')
</script>

<template>
  <button
    type="button"
    @click="theme.toggle()"
    :aria-label="label"
    :title="label"
    class="inline-flex items-center justify-center w-11 h-11 rounded-full border border-line-strong bg-transparent text-ink-2 cursor-pointer transition-[color,border-color,background-color,transform] duration-150 hover:text-ink hover:border-ink-2 active:scale-95 font-pix text-lg"
  >
    <span class="leading-none">{{ icon }}</span>
  </button>
</template>
