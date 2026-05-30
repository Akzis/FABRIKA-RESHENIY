/**
 * On create, fill displayName from username so existing components
 * that show the player name don't have to special-case anonymous users.
 */
export default {
  beforeCreate(event: any) {
    const { data } = event.params
    if (!data) return
    if (!data.displayName && data.username) {
      data.displayName = data.username
    }
  },
}
