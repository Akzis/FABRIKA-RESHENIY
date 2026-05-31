/**
 * Capture an `?invite=<token>` query param into storage as early as possible,
 * before AuthGate / the landing decide what to render. Redemption happens once
 * the user is authenticated (see index.vue and AuthGate).
 */
export default defineNuxtPlugin(() => {
  useTeamInvite().capture()
})
