/**
 * Override `users-permissions` so /api/users/me returns the extended profile,
 * and add custom endpoints for the authenticated user:
 *   POST /api/users/me/role   — set own team role (member / pm)
 *   POST /api/users/me/invite — PM mints a 30-min team-invite link token
 *   POST /api/users/me/join   — redeem an invite token → join that team
 */
import jwt from 'jsonwebtoken';

// How long a copied invite link stays valid (the PM hands it to a participant).
const INVITE_TTL_SECONDS = 30 * 60; // 30 minutes

export default (plugin: any) => {
  const ORIGINAL_ME = plugin.controllers.user.me;
  const ORIGINAL_FIND = plugin.controllers.user.find;

  // Untyped entity-service handle: the `api::team.team` UID and the new team
  // relations on User aren't in the generated types until Strapi regenerates
  // them on boot, so a typed call would fail `tsc` during the build step.
  const es: any = (strapi as any).entityService;

  // Secret used to sign/verify invite tokens — reuse the users-permissions
  // JWT secret so no extra config is required.
  const inviteSecret = (): string =>
    strapi.config.get('plugin::users-permissions.jwtSecret') as string;

  // ── /api/users/me — extended profile + populated relations ──────────────
  plugin.controllers.user.me = async (ctx: any) => {
    const userId = ctx.state.user?.id;
    if (!userId) return ORIGINAL_ME.call(plugin.controllers.user, ctx);

    const user: any = await es.findOne(
      'plugin::users-permissions.user',
      userId,
      {
        populate: {
          completedDailyQuests: true,
          completedChallenges: { fields: ['id'] },
          earnedBadges: { fields: ['id'] },
          avatar: true,
          team: { fields: ['id', 'name'] },
          managedTeam: { fields: ['id', 'name'] },
        },
        fields: [
          'id', 'username', 'email', 'confirmed', 'blocked',
          'displayName', 'teamRole', 'profileActivated',
          'xp', 'level', 'xpToNextLevel',
          'streak', 'challengesClosed', 'badgesCount',
          'teamCupPlace', 'teamCupCurrent', 'teamCupTotal',
          'createdAt', 'updatedAt',
        ],
      },
    );

    // The front consumes `team` as a plain display string. A PM "owns" a team
    // (managedTeam); a participant "belongs" to one (team). Flatten to the name.
    const teamEntity = user?.teamRole === 'pm' ? user?.managedTeam : user?.team;
    ctx.body = { ...user, team: teamEntity?.name ?? null };
  };

  // ── /api/users — attach team name to each user (leaderboard) ───────────
  // The default users-permissions `find` strips relation populate during
  // sanitization, so the leaderboard never saw `team`. Re-attach it here as a
  // `{ name }` object so the front can read `u.team.name`.
  plugin.controllers.user.find = async (ctx: any) => {
    await ORIGINAL_FIND.call(plugin.controllers.user, ctx);

    const list: any[] = Array.isArray(ctx.body) ? ctx.body : ctx.body?.results;
    if (!Array.isArray(list) || !list.length) return;

    const ids = list.map((u) => u.id).filter((x) => x != null);
    const withTeam: any[] = await es.findMany('plugin::users-permissions.user', {
      filters: { id: { $in: ids } },
      fields: ['id', 'teamRole'],
      populate: { team: { fields: ['name'] }, managedTeam: { fields: ['name'] } },
    });
    const byId = new Map(withTeam.map((u) => [u.id, u]));

    for (const u of list) {
      const rec = byId.get(u.id);
      const name = (rec?.teamRole === 'pm' ? rec?.managedTeam?.name : rec?.team?.name) ?? null;
      u.team = name ? { name } : null;
    }
  };

  // ── /api/users/me/role — current user sets their own team role ─────────
  plugin.controllers.user.setRole = async (ctx: any) => {
    const userId = ctx.state.user?.id;
    if (!userId) return ctx.unauthorized('not logged in');

    const { role, teamName } = ctx.request.body ?? {};
    if (role !== 'member' && role !== 'pm') {
      return ctx.badRequest('role must be "member" or "pm"');
    }

    // Member: just flip the role. Team membership is set later via an invite.
    if (role === 'member') {
      await es.update(
        'plugin::users-permissions.user', userId, { data: { teamRole: 'member' } },
      );
      return (ctx.body = { ok: true, teamRole: 'member' });
    }

    // PM: must name a team. Claim it if free (or already theirs), else 409.
    const name = String(teamName ?? '').trim();
    if (!name) return ctx.badRequest('teamName is required for a project manager');

    const existing = await es.findMany('api::team.team', {
      filters: { name },
      populate: { pm: { fields: ['id'] } },
      limit: 1,
    });
    let team: any = existing?.[0];

    if (team) {
      if (team.pm && team.pm.id !== userId) {
        return ctx.throw(409, 'Команда с таким названием уже занята другим менеджером');
      }
      team = await es.update('api::team.team', team.id, {
        data: { pm: userId },
      });
    } else {
      team = await es.create('api::team.team', {
        data: { name, pm: userId },
      });
    }

    // A PM owns the team but is not one of its members — clear any membership.
    await es.update(
      'plugin::users-permissions.user', userId, { data: { teamRole: 'pm', team: null } },
    );

    ctx.body = { ok: true, teamRole: 'pm', team: team.name };
  };

  // ── /api/users/me/invite — PM mints a short-lived team-invite token ────
  plugin.controllers.user.createInvite = async (ctx: any) => {
    const userId = ctx.state.user?.id;
    if (!userId) return ctx.unauthorized('not logged in');

    const me: any = await es.findOne(
      'plugin::users-permissions.user', userId,
      { fields: ['teamRole'], populate: { managedTeam: { fields: ['id', 'name'] } } },
    );
    if (!me || me.teamRole !== 'pm') {
      return ctx.forbidden('only a project manager can invite participants');
    }
    if (!me.managedTeam) {
      return ctx.badRequest('your team is not set yet');
    }

    const token = jwt.sign(
      { kind: 'team-invite', teamId: me.managedTeam.id, team: me.managedTeam.name, inviter: userId },
      inviteSecret(),
      { expiresIn: INVITE_TTL_SECONDS },
    );

    ctx.body = {
      token,
      team: me.managedTeam.name,
      expiresAt: new Date(Date.now() + INVITE_TTL_SECONDS * 1000).toISOString(),
    };
  };

  // ── /api/users/me/join — redeem an invite token → join that team ───────
  plugin.controllers.user.joinTeam = async (ctx: any) => {
    const userId = ctx.state.user?.id;
    if (!userId) return ctx.unauthorized('not logged in');

    const { token } = ctx.request.body ?? {};
    if (!token || typeof token !== 'string') {
      return ctx.badRequest('token is required');
    }

    let payload: any;
    try {
      payload = jwt.verify(token, inviteSecret());
    } catch {
      return ctx.badRequest('invite link is invalid or has expired');
    }
    if (payload?.kind !== 'team-invite' || !payload?.teamId) {
      return ctx.badRequest('invite link is invalid');
    }

    // The team could have been deleted/renamed since the link was minted.
    const team: any = await es.findOne(
      'api::team.team', payload.teamId, { fields: ['id', 'name'] },
    );
    if (!team) return ctx.badRequest('this team no longer exists');

    const me: any = await es.findOne(
      'plugin::users-permissions.user', userId, { fields: ['teamRole'] },
    );

    // Joining a team makes you a member of it; don't silently demote a PM.
    const data: Record<string, unknown> = { team: team.id };
    if (me?.teamRole !== 'pm') data.teamRole = 'member';

    await es.update(
      'plugin::users-permissions.user', userId, { data },
    );

    ctx.body = { ok: true, team: team.name };
  };

  // ── /api/users/me/tasks/complete — mark a challenge or daily quest done ─
  // Body: { kind: 'challenge' | 'daily', id: number }. Idempotent: completing
  // an already-done task awards nothing again. Awards XP (and, for challenges,
  // bumps challengesClosed).
  plugin.controllers.user.completeTask = async (ctx: any) => {
    const userId = ctx.state.user?.id;
    if (!userId) return ctx.unauthorized('not logged in');

    const { kind, id } = ctx.request.body ?? {};
    const taskId = Number(id);
    if ((kind !== 'challenge' && kind !== 'daily') || !taskId) {
      return ctx.badRequest('kind must be "challenge"/"daily" and id is required');
    }

    const isChallenge = kind === 'challenge';
    const uid = isChallenge ? 'api::challenge.challenge' : 'api::daily-quest.daily-quest';
    const relation = isChallenge ? 'completedChallenges' : 'completedDailyQuests';
    const rewardField = isChallenge ? 'xp' : 'points';

    const task: any = await es.findOne(uid, taskId, { fields: ['id', rewardField] });
    if (!task) return ctx.badRequest('task not found');

    const me: any = await es.findOne('plugin::users-permissions.user', userId, {
      fields: ['xp', 'challengesClosed'],
      populate: { [relation]: { fields: ['id'] } },
    });

    // Existing completed ids for this relation. We rewrite the whole array
    // (most reliable way to persist a m2m on the users-permissions user) rather
    // than rely on `connect`, which didn't always stick here.
    const doneIds: number[] = (me?.[relation] ?? [])
      .map((t: any) => t.id)
      .filter((x: any) => x != null);

    if (doneIds.includes(taskId)) {
      return (ctx.body = { ok: true, already: true, xp: me?.xp ?? 0 });
    }

    const reward = Number(task[rewardField]) || 0;
    const data: Record<string, unknown> = {
      [relation]: [...doneIds, taskId],
      xp: (Number(me?.xp) || 0) + reward,
    };
    if (isChallenge) data.challengesClosed = (Number(me?.challengesClosed) || 0) + 1;

    await es.update('plugin::users-permissions.user', userId, { data });

    ctx.body = { ok: true, awarded: reward, xp: (Number(me?.xp) || 0) + reward };
  };

  // ── /api/users/me/avatar — upload & set the current user's avatar ──────
  plugin.controllers.user.setAvatar = async (ctx: any) => {
    const userId = ctx.state.user?.id;
    if (!userId) return ctx.unauthorized('not logged in');

    const incoming = ctx.request.files ?? {};
    const raw = incoming.files ?? incoming.file ?? Object.values(incoming)[0];
    const file = Array.isArray(raw) ? raw[0] : raw;
    if (!file) return ctx.badRequest('image file is required');
    if (file.mimetype && !String(file.mimetype).startsWith('image/')) {
      return ctx.badRequest('only image files are allowed');
    }

    const uploadService = strapi.plugin('upload').service('upload');

    // Remember the previous avatar so we can delete it after switching.
    const before: any = await es.findOne(
      'plugin::users-permissions.user', userId, { populate: { avatar: true } },
    );

    const [uploaded] = await uploadService.upload({ data: {}, files: file });

    await es.update(
      'plugin::users-permissions.user', userId, { data: { avatar: uploaded.id } },
    );

    if (before?.avatar?.id && before.avatar.id !== uploaded.id) {
      try { await uploadService.remove(before.avatar); } catch { /* ignore */ }
    }

    ctx.body = { ok: true, avatar: { id: uploaded.id, url: uploaded.url } };
  };

  plugin.routes['content-api'].routes.push(
    {
      method: 'POST',
      path: '/users/me/role',
      handler: 'user.setRole',
      config: { prefix: '', policies: [] },
    },
    {
      method: 'POST',
      path: '/users/me/avatar',
      handler: 'user.setAvatar',
      config: { prefix: '', policies: [] },
    },
    {
      method: 'POST',
      path: '/users/me/tasks/complete',
      handler: 'user.completeTask',
      config: { prefix: '', policies: [] },
    },
    {
      method: 'POST',
      path: '/users/me/invite',
      handler: 'user.createInvite',
      config: { prefix: '', policies: [] },
    },
    {
      method: 'POST',
      path: '/users/me/join',
      handler: 'user.joinTeam',
      config: { prefix: '', policies: [] },
    },
  );

  return plugin;
};
