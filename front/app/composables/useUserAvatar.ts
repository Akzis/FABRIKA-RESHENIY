/**
 * User avatar: resolve the absolute image URL for the logged-in user and
 * upload a new one via /api/users/me/avatar (which stores it on the user and
 * cleans up the previous file server-side).
 */
import type { UserProfile } from '~/types/user'

export function useUserAvatar() {
  const strapiBase = (useRuntimeConfig().public as any)?.strapi?.url ?? 'http://localhost:1337'
  const token = useStrapiToken()
  const { fetchUser } = useStrapiAuth()
  const user = useStrapiUser<UserProfile>()

  // Strapi returns a relative media url (e.g. /uploads/x.png); make it absolute.
  const toAbsolute = (url?: string | null): string | null => {
    if (!url) return null
    return /^https?:\/\//.test(url) ? url : `${strapiBase}${url}`
  }

  const avatarUrl = computed(() => toAbsolute(user.value?.avatar?.url))

  /** Upload an image file as the current user's avatar. Returns the new URL. */
  const upload = async (file: File): Promise<string | null> => {
    if (!token.value) return null
    const form = new FormData()
    form.append('files', file)
    const res = await $fetch<{ ok: boolean; avatar: { url: string } }>(
      `${strapiBase}/api/users/me/avatar`,
      { method: 'POST', body: form, headers: { Authorization: `Bearer ${token.value}` } },
    )
    await fetchUser() // refresh useStrapiUser() so the new avatar shows everywhere
    return toAbsolute(res?.avatar?.url)
  }

  return { avatarUrl, upload, toAbsolute }
}
