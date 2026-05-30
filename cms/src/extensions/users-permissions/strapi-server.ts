/**
 * Override `users-permissions` so /api/users/me returns the extended profile,
 * and add /api/users/me/role for the authenticated user to set their team role.
 */
export default (plugin: any) => {
  const ORIGINAL_ME = plugin.controllers.user.me

  // ── /api/users/me — extended profile + populated relations ──────────────
  plugin.controllers.user.me = async (ctx: any) => {
    const userId = ctx.state.user?.id
    if (!userId) return ORIGINAL_ME.call(plugin.controllers.user, ctx)

    const user = await strapi.entityService.findOne(
      'plugin::users-permissions.user',
      userId,
      {
        populate: { completedDailyQuests: true },
        fields: [
          'id', 'username', 'email', 'confirmed', 'blocked',
          'displayName', 'team', 'teamRole',
          'xp', 'level', 'xpToNextLevel',
          'streak', 'challengesClosed', 'badgesCount',
          'teamCupPlace', 'teamCupCurrent', 'teamCupTotal',
          'createdAt', 'updatedAt',
        ],
      },
    )

    ctx.body = user
  }

  // ── /api/users/me/role — current user sets their own team role ─────────
  plugin.controllers.user.setRole = async (ctx: any) => {
    const userId = ctx.state.user?.id
    if (!userId) return ctx.unauthorized('not logged in')

    const role = ctx.request.body?.role
    if (role !== 'member' && role !== 'pm') {
      return ctx.badRequest('role must be "member" or "pm"')
    }

    await strapi.entityService.update(
      'plugin::users-permissions.user', userId, { data: { teamRole: role } },
    )

    ctx.body = { ok: true, teamRole: role }
  }

  plugin.routes['content-api'].routes.push({
    method: 'POST',
    path: '/users/me/role',
    handler: 'user.setRole',
    config: { prefix: '', policies: [] },
  })

  return plugin
}
