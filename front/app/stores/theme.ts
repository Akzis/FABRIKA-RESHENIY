import { defineStore } from 'pinia'

export type Theme = 'dark' | 'light'

const STORAGE_KEY = 'fr-theme'

const detectInitial = (): Theme => {
  if (!import.meta.client) return 'dark'
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'light' || saved === 'dark') return saved
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
  } catch {
    return 'dark'
  }
}

export const useThemeStore = defineStore('theme', {
  state: () => ({
    theme: 'dark' as Theme,
    initialized: false,
  }),
  actions: {
    init() {
      if (this.initialized) return
      this.theme = detectInitial()
      this.apply()
      this.initialized = true
    },
    apply() {
      if (!import.meta.client) return
      document.documentElement.setAttribute('data-theme', this.theme)
    },
    set(theme: Theme) {
      this.theme = theme
      this.apply()
      if (import.meta.client) {
        try { localStorage.setItem(STORAGE_KEY, theme) } catch { /* ignore */ }
      }
    },
    toggle() {
      this.set(this.theme === 'dark' ? 'light' : 'dark')
    },
  },
})
