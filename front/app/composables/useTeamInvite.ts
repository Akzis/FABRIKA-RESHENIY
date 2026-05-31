/**
 * Team invite links.
 *
 * A project manager mints a short-lived (30 min) token via /api/users/me/invite
 * and shares a link like `https://app/?invite=<token>`. When a participant opens
 * that link and is (or becomes) logged in, the token is redeemed via
 * /api/users/me/join, which adds them to the PM's team.
 */
const STORAGE_KEY = 'fr-invite'

export interface InviteLink {
  url: string
  token: string
  team: string
  expiresAt: string
}

export function useTeamInvite() {
  const strapiBase = (useRuntimeConfig().public as any)?.strapi?.url ?? 'http://localhost:1337'
  const token = useStrapiToken()
  const { fetchUser } = useStrapiAuth()

  const readPending = (): string | null => {
    if (!import.meta.client) return null
    try { return localStorage.getItem(STORAGE_KEY) } catch { return null }
  }
  const clearPending = () => {
    if (!import.meta.client) return
    try { localStorage.removeItem(STORAGE_KEY) } catch { /* ignore */ }
  }

  /**
   * Grab `?invite=...` from the current URL, stash it, and strip it from the
   * address bar so a refresh/share of the now-clean URL doesn't re-trigger it.
   * Safe to call on every client load.
   */
  const capture = () => {
    if (!import.meta.client) return
    const url = new URL(window.location.href)
    const inv = url.searchParams.get('invite')
    if (!inv) return
    try { localStorage.setItem(STORAGE_KEY, inv) } catch { /* ignore */ }
    url.searchParams.delete('invite')
    window.history.replaceState({}, '', url.pathname + url.search + url.hash)
  }

  /**
   * Redeem a pending invite for the currently logged-in user. No-op when there
   * is no stored invite or no auth token. Clears the invite on any outcome so a
   * bad/expired token doesn't keep retrying. Returns true when the team changed.
   */
  const redeem = async (): Promise<boolean> => {
    const inv = readPending()
    if (!inv || !token.value) return false
    try {
      await $fetch(`${strapiBase}/api/users/me/join`, {
        method: 'POST',
        body: { token: inv },
        headers: { Authorization: `Bearer ${token.value}` },
      })
      clearPending()
      await fetchUser() // refresh useStrapiUser() so the new team shows up
      return true
    } catch {
      clearPending()
      return false
    }
  }

  /** PM-only: mint a fresh invite link valid for 30 minutes. */
  const createInvite = async (): Promise<InviteLink | null> => {
    if (!token.value || !import.meta.client) return null
    const res = await $fetch<{ token: string; team: string; expiresAt: string }>(
      `${strapiBase}/api/users/me/invite`,
      { method: 'POST', headers: { Authorization: `Bearer ${token.value}` } },
    )
    return {
      ...res,
      url: `${window.location.origin}/?invite=${res.token}`,
    }
  }

  return { capture, redeem, readPending, clearPending, createInvite }
}
