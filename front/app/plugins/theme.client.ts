import { useThemeStore } from '~/stores/theme'

// Apply saved/preferred theme before the app mounts to avoid a dark→light flash.
export default defineNuxtPlugin(() => {
  const theme = useThemeStore()
  theme.init()
})
