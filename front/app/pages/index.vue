<script setup lang="ts">
import { onMounted } from 'vue'
import type { UserProfile } from '~/types/user'

const user = useStrapiUser<UserProfile>()
const token = useStrapiToken()
const strapiBase = (useRuntimeConfig().public as any)?.strapi?.url ?? 'http://localhost:1337'

// Fetch extended profile fields (level, xp, streak, etc.) from /api/users/me
// and merge into useStrapiUser() so ProfileModal has real data.
await useAsyncData('user-profile', async () => {
  if (!token.value || !user.value) return null
  try {
    const profile = await $fetch<Record<string, unknown>>(`${strapiBase}/api/users/me`, {
      headers: { Authorization: `Bearer ${token.value}` },
    })
    if (profile && user.value) Object.assign(user.value, profile)
  } catch { /* no-op — defaults kick in */ }
  return null
})

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
  <PendingActivation v-else-if="user.teamRole === 'pm' && !user.profileActivated" />
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
