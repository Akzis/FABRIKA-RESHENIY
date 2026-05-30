<script setup lang="ts">
import { onMounted } from 'vue'

const user = useStrapiUser()

// Eagerly fetch landing content from Strapi. Cached via useAsyncData so the
// fetch is shared between SSR and client hydration. Errors are swallowed
// inside useStrapiLanding → store stays empty → defaults kick in.
await useAsyncData('landing', async () => {
  await useStrapiLanding()
  return true
})

onMounted(() => {
  const onClick = (e: Event) => {
    const a = (e.target as HTMLElement).closest('a[href^="#"]') as HTMLAnchorElement | null
    if (!a) return
    const id = a.getAttribute('href')
    if (!id || id.length <= 1) return
    const el = document.querySelector(id)
    if (!el) return
    e.preventDefault()
    const top = (el as HTMLElement).offsetTop - 60
    window.scrollTo({ top, behavior: 'smooth' })
  }
  document.addEventListener('click', onClick)
})
</script>

<template>
  <AuthGate v-if="!user" />
  <div v-else>
    <AppNav />
    <AppHero />
    <SectionHowItWorks />
    <SectionLevels />
    <SectionAchievements />
    <SectionProgress />
    <SectionLeaderboard />
    <SectionRoles />
    <SectionFinalCta />
    <AppFooter />
  </div>
</template>
