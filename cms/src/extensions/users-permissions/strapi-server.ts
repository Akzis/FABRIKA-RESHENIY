/**
 * Override `users-permissions` so /api/users/me returns the extended profile,
 * and add custom endpoints for the authenticated user:
 *   POST /api/users/me/role   — set own team role (member / pm)
 *   POST /api/users/me/invite — PM mints a 30-min team-invite link token
 *   POST /api/users/me/join   — redeem an invite token → join that team
 */
import jwt from 'jsonwebtoken';
import { STARTER_PROFILE_IMAGE } from '../../seed-data';

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
  const HEADER_DEFAULT = {
    color: '#d9fbff',
    image: '/voxel/dino.png',
    imageX: 82,
    imageY: 50,
    imageSize: 104,
  };
  const clamp = (n: unknown, min: number, max: number, fallback: number) => {
    const value = Number(n);
    if (!Number.isFinite(value)) return fallback;
    return Math.min(max, Math.max(min, Math.round(value)));
  };
  const normalizeProfileHeader = (raw: any) => {
    const color = String(raw?.color ?? '').trim();
    const image = String(raw?.image ?? '').trim();
    return {
      color: /^#[0-9a-f]{6}$/i.test(color) ? color.toLowerCase() : HEADER_DEFAULT.color,
      image: image.length <= 255 ? image : HEADER_DEFAULT.image,
      imageX: clamp(raw?.imageX, 0, 100, HEADER_DEFAULT.imageX),
      imageY: clamp(raw?.imageY, 0, 100, HEADER_DEFAULT.imageY),
      imageSize: clamp(raw?.imageSize, 54, 180, HEADER_DEFAULT.imageSize),
    };
  };

  // ── Progression helpers ────────────────────────────────────────────────
  // Flat curve: every level costs the same amount of XP. level 1 = 0 XP.
  // Keeps `xpToNextLevel` in sync so the dashboard progress bar is correct.
  const XP_PER_LEVEL = 250;
  const levelFromXp = (xp: unknown) => {
    const total = Math.max(0, Number(xp) || 0);
    const level = Math.floor(total / XP_PER_LEVEL) + 1;
    const xpToNextLevel = XP_PER_LEVEL - (total % XP_PER_LEVEL);
    return { level, xpToNextLevel };
  };

  // Daily-streak bookkeeping. Counts calendar days on which the user closed at
  // least one daily quest: same day → unchanged, consecutive day → +1, gap → reset to 1.
  const dayStr = (d: Date) => d.toISOString().slice(0, 10);
  const nextStreak = (lastDailyDate: unknown, currentStreak: unknown) => {
    const today = dayStr(new Date());
    const prev = lastDailyDate ? String(lastDailyDate).slice(0, 10) : null;
    let streak = Number(currentStreak) || 0;
    if (prev === today) {
      streak = streak || 1; // already counted today
    } else {
      const yesterday = dayStr(new Date(Date.now() - 86_400_000));
      streak = prev === yesterday ? streak + 1 : 1;
    }
    return { streak, today };
  };

  // ── Activity log ───────────────────────────────────────────────────────
  // One row per completed task on a given calendar day — the source for the
  // team activity heatmap. Daily completions are logged from completeTask;
  // challenge completions from reviewSubmission (and backfilled from existing
  // submissions at boot). `sourceId` (the submission id for challenges) keeps
  // the boot backfill idempotent.
  const logActivity = async (args: {
    userId: number;
    teamId: number | null;
    kind: 'challenge' | 'daily';
    day: string; // YYYY-MM-DD
    xp?: number;
    sourceId?: number | null;
  }) => {
    try {
      await es.create('api::activity-event.activity-event', {
        data: {
          user: args.userId,
          team: args.teamId ?? null,
          kind: args.kind,
          day: args.day,
          xp: Math.max(0, Number(args.xp) || 0),
          sourceId: args.sourceId ?? null,
        },
      });
    } catch (e: any) {
      strapi.log.warn(`[activity] could not log ${args.kind} event: ${e?.message ?? e}`);
    }
  };

  // ── Badge awarding ─────────────────────────────────────────────────────
  // Re-evaluates every badge that has an automatic condition and grants the
  // ones the user now qualifies for. Idempotent: already-earned badges are
  // skipped, so it's safe to call after any stat change. Keeps `badgesCount`
  // in sync. Returns the freshly-awarded badges ({ id, code, label }).
  const awardBadges = async (userId: number) => {
    const user: any = await es.findOne('plugin::users-permissions.user', userId, {
      fields: ['xp', 'level', 'streak', 'challengesClosed'],
      populate: {
        earnedBadges: { fields: ['id'] },
        completedDailyQuests: { fields: ['id'] },
        completedChallenges: { fields: ['id', 'level'] },
      },
    });
    if (!user) return [];

    const stats = {
      level: Number(user.level) || 1,
      streak: Number(user.streak) || 0,
      challengesClosed: Number(user.challengesClosed) || 0,
      dailies: (user.completedDailyQuests ?? []).length,
      challengeLevels: new Set(
        (user.completedChallenges ?? []).map((c: any) => String(c.level || '')),
      ),
    };

    const earnedIds: number[] = (user.earnedBadges ?? [])
      .map((b: any) => b.id)
      .filter((x: any) => x != null);
    const earnedSet = new Set(earnedIds);

    const badges: any[] = await es.findMany('api::badge.badge', {
      filters: { conditionType: { $ne: 'none' } },
      fields: ['id', 'code', 'label', 'conditionType', 'conditionValue', 'xpReward', 'rewardImage'],
      limit: 500,
    });

    const meets = (b: any): boolean => {
      const v = Number(b.conditionValue) || 0;
      switch (b.conditionType) {
        case 'first_light_challenge':  return stats.challengeLevels.has('light');
        case 'first_medium_challenge': return stats.challengeLevels.has('medium');
        case 'first_hard_challenge':   return stats.challengeLevels.has('hard');
        case 'reach_level':            return stats.level >= v;
        case 'complete_dailies':       return stats.dailies >= v;
        case 'streak_days':            return stats.streak >= v;
        case 'complete_challenges':    return stats.challengesClosed >= v;
        default:                       return false;
      }
    };

    const newly = badges.filter((b) => !earnedSet.has(b.id) && meets(b));
    if (!newly.length) return [];

    // Earning badges also pays out their xpReward and recomputes level.
    const bonusXp = newly.reduce((sum, b) => sum + (Number(b.xpReward) || 0), 0);
    const newXp = (Number(user.xp) || 0) + bonusXp;
    const { level, xpToNextLevel } = levelFromXp(newXp);

    const nextIds = [...earnedIds, ...newly.map((b) => b.id)];
    await es.update('plugin::users-permissions.user', userId, {
      data: {
        earnedBadges: nextIds,
        badgesCount: nextIds.length,
        xp: newXp,
        level,
        xpToNextLevel,
      },
    });

    return newly.map((b) => ({
      id: b.id, code: b.code, label: b.label,
      xpReward: Number(b.xpReward) || 0, rewardImage: b.rewardImage ?? null,
    }));
  };

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
          earnedBadges: { fields: ['id', 'code', 'label', 'rewardImage'] },
          avatar: true,
          team: { fields: ['id', 'name'] },
          managedTeam: { fields: ['id', 'name'] },
        },
        fields: [
          'id', 'username', 'email', 'confirmed', 'blocked',
          'displayName', 'teamRole', 'profileActivated',
          'profileHeader',
          'xp', 'spentXp', 'level', 'xpToNextLevel',
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

    // Daily quests carry their type + answer key; challenges don't.
    const taskFields = isChallenge
      ? ['id', rewardField]
      : ['id', rewardField, 'kind', 'correctAnswer'];
    const task: any = await es.findOne(uid, taskId, { fields: taskFields });
    if (!task) return ctx.badRequest('task not found');

    // Quiz dailies are only credited for the correct option. The answer is the
    // 0-based index the client picked; we check it here so the answer key never
    // has to leave the server (the public API strips `correctAnswer`).
    if (!isChallenge && task.kind === 'quiz') {
      const answer = Number(ctx.request.body?.answer);
      if (!Number.isInteger(answer) || answer !== Number(task.correctAnswer)) {
        return (ctx.body = { ok: false, wrongAnswer: true });
      }
    }

    const me: any = await es.findOne('plugin::users-permissions.user', userId, {
      fields: ['xp', 'challengesClosed', 'streak', 'lastDailyDate'],
      populate: { [relation]: { fields: ['id'] }, team: { fields: ['id'] } },
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
    const newXp = (Number(me?.xp) || 0) + reward;
    const { level, xpToNextLevel } = levelFromXp(newXp);
    const data: Record<string, unknown> = {
      [relation]: [...doneIds, taskId],
      xp: newXp,
      level,
      xpToNextLevel,
    };
    if (isChallenge) {
      data.challengesClosed = (Number(me?.challengesClosed) || 0) + 1;
    } else {
      // Closing a daily quest keeps the calendar-day streak alive.
      const { streak, today } = nextStreak(me?.lastDailyDate, me?.streak);
      data.streak = streak;
      data.lastDailyDate = today;
    }

    await es.update('plugin::users-permissions.user', userId, { data });

    // Record the completion for the activity heatmap. Challenges normally flow
    // through the submit → review path (logged in reviewSubmission); a direct
    // challenge completion here is logged too so the heatmap stays complete.
    await logActivity({
      userId,
      teamId: me?.team?.id ?? null,
      kind: isChallenge ? 'challenge' : 'daily',
      day: dayStr(new Date()),
      xp: reward,
    });

    // Re-check badge conditions against the user's new stats.
    const awardedBadges = await awardBadges(userId);

    ctx.body = { ok: true, awarded: reward, xp: newXp, level, awardedBadges };
  };

  // ── /api/users/me/challenges/submit — participant sends a challenge for review ─
  // Multipart: { challengeId, comment, files[] }. Creates a `pending` submission
  // bound to the participant + their team. Blocks duplicates while one is still
  // pending or fully approved. A rejected *or partially credited* one may be
  // resubmitted — review then tops up the XP to the new grade (see reviewSubmission).
  plugin.controllers.user.submitChallenge = async (ctx: any) => {
    const userId = ctx.state.user?.id;
    if (!userId) return ctx.unauthorized('not logged in');

    const body = ctx.request.body ?? {};
    const challengeId = Number(body.challengeId ?? body.challenge ?? body.id);
    const comment = String(body.comment ?? '').trim();
    if (!challengeId) return ctx.badRequest('challengeId is required');

    const challenge: any = await es.findOne('api::challenge.challenge', challengeId, {
      fields: ['id', 'xp', 'title'],
    });
    if (!challenge) return ctx.badRequest('challenge not found');

    const me: any = await es.findOne('plugin::users-permissions.user', userId, {
      fields: ['id'],
      populate: { team: { fields: ['id'] } },
    });
    const teamId = me?.team?.id ?? null;
    if (!teamId) return ctx.badRequest('сначала вступите в команду');

    // Already waiting on / credited for this challenge? Don't queue another.
    const active: any[] = await es.findMany(
      'api::challenge-submission.challenge-submission',
      {
        filters: {
          participant: userId,
          challenge: challengeId,
          status: { $in: ['pending', 'approved'] },
        },
        fields: ['id'],
        limit: 1,
      },
    );
    if (active?.length) {
      return ctx.badRequest('это задание уже отправлено на проверку');
    }

    // Upload any attached files (best-effort: a failed file is skipped).
    const incoming = ctx.request.files ?? {};
    const raw = incoming.files ?? incoming.file ?? Object.values(incoming)[0];
    const files = raw ? (Array.isArray(raw) ? raw : [raw]) : [];
    const uploadService = strapi.plugin('upload').service('upload');
    const uploadedIds: number[] = [];
    for (const f of files) {
      try {
        const [up] = await uploadService.upload({ data: {}, files: f });
        if (up?.id) uploadedIds.push(up.id);
      } catch { /* skip this file */ }
    }

    const created: any = await es.create(
      'api::challenge-submission.challenge-submission',
      {
        data: {
          challenge: challengeId,
          participant: userId,
          team: teamId,
          comment,
          attachments: uploadedIds,
          status: 'pending',
        },
      },
    );

    ctx.body = { ok: true, id: created.id, status: 'pending' };
  };

  // ── /api/users/me/submissions — list submissions ───────────────────────
  // PM → every submission for their managed team. Participant → their own.
  plugin.controllers.user.listSubmissions = async (ctx: any) => {
    const userId = ctx.state.user?.id;
    if (!userId) return ctx.unauthorized('not logged in');

    const me: any = await es.findOne('plugin::users-permissions.user', userId, {
      fields: ['teamRole'],
      populate: { managedTeam: { fields: ['id'] } },
    });

    let filters: any;
    if (me?.teamRole === 'pm') {
      const teamId = me?.managedTeam?.id;
      if (!teamId) return (ctx.body = { data: [] });
      filters = { team: teamId };
    } else {
      filters = { participant: userId };
    }

    const rows: any[] = await es.findMany(
      'api::challenge-submission.challenge-submission',
      {
        filters,
        populate: {
          challenge: { fields: ['id', 'title', 'level', 'xp'] },
          participant: { fields: ['id', 'username', 'displayName'] },
          attachments: { fields: ['id', 'name', 'url', 'mime', 'size'] },
        },
        sort: { createdAt: 'desc' },
        limit: 200,
      },
    );

    const data = (rows ?? []).map((r) => ({
      id: r.id,
      status: r.status,
      comment: r.comment ?? '',
      awardedXp: r.awardedXp ?? 0,
      reviewNote: r.reviewNote ?? '',
      reviewedAt: r.reviewedAt ?? null,
      createdAt: r.createdAt,
      challenge: r.challenge
        ? { id: r.challenge.id, title: r.challenge.title, level: r.challenge.level, xp: r.challenge.xp }
        : null,
      participant: r.participant
        ? { id: r.participant.id, name: r.participant.displayName || r.participant.username }
        : null,
      attachments: (r.attachments ?? []).map((a: any) => ({
        id: a.id, name: a.name, url: a.url, mime: a.mime, size: a.size,
      })),
    }));

    ctx.body = { data };
  };

  // ── /api/users/me/submissions/:id/review — PM grades a submission ──────
  // Body: { decision: 'approved'|'rejected'|'partial', awardedXp?, reviewNote? }.
  // approved/partial credit the participant (XP + completedChallenges); rejected
  // awards nothing and lets them resubmit. XP is credited as a delta over what
  // earlier submissions of the same challenge already paid, so a partial→resubmit
  // →full pass tops up to the new grade. Only the owning team's PM may review.
  plugin.controllers.user.reviewSubmission = async (ctx: any) => {
    const userId = ctx.state.user?.id;
    if (!userId) return ctx.unauthorized('not logged in');

    const subId = Number(ctx.params?.id);
    const { decision, awardedXp, reviewNote } = ctx.request.body ?? {};
    if (!subId) return ctx.badRequest('submission id is required');
    if (!['approved', 'rejected', 'partial'].includes(decision)) {
      return ctx.badRequest('decision must be "approved", "rejected" or "partial"');
    }

    const me: any = await es.findOne('plugin::users-permissions.user', userId, {
      fields: ['teamRole'],
      populate: { managedTeam: { fields: ['id'] } },
    });
    if (me?.teamRole !== 'pm') {
      return ctx.forbidden('only a project manager can review submissions');
    }

    const sub: any = await es.findOne(
      'api::challenge-submission.challenge-submission', subId,
      {
        fields: ['id', 'status'],
        populate: {
          challenge: { fields: ['id', 'xp'] },
          participant: { fields: ['id'] },
          team: { fields: ['id'] },
        },
      },
    );
    if (!sub) return ctx.notFound('submission not found');
    if (sub.team?.id !== me?.managedTeam?.id) {
      return ctx.forbidden('эта сдача не из вашей команды');
    }
    if (sub.status !== 'pending') {
      return ctx.badRequest('эта сдача уже проверена');
    }

    const challengeXp = Number(sub.challenge?.xp) || 0;
    let reward = 0;
    if (decision === 'approved') {
      reward = awardedXp != null ? Number(awardedXp) : challengeXp;
    } else if (decision === 'partial') {
      reward = awardedXp != null ? Number(awardedXp) : Math.round(challengeXp / 2);
    }
    reward = Math.max(0, Math.floor(reward) || 0);

    await es.update('api::challenge-submission.challenge-submission', subId, {
      data: {
        status: decision,
        awardedXp: reward,
        reviewNote: String(reviewNote ?? '').trim(),
        reviewedAt: new Date(),
      },
    });

    // Credit the participant on a passing grade (approved or partial).
    if (decision !== 'rejected' && sub.participant?.id) {
      const pid = sub.participant.id;
      const challengeId = sub.challenge?.id;
      const participant: any = await es.findOne('plugin::users-permissions.user', pid, {
        fields: ['xp', 'challengesClosed'],
        populate: { completedChallenges: { fields: ['id'] } },
      });
      const doneIds: number[] = (participant?.completedChallenges ?? [])
        .map((c: any) => c.id)
        .filter((x: any) => x != null);

      // A partially-credited challenge may have already paid out on an earlier
      // submission. Only top up by the delta so a resubmit→full-pass lands the
      // participant on the new grade's total, not the sum of both reviews.
      let priorAwarded = 0;
      if (challengeId) {
        const prior: any[] = await es.findMany(
          'api::challenge-submission.challenge-submission',
          {
            filters: {
              participant: pid,
              challenge: challengeId,
              status: { $in: ['approved', 'partial'] },
              id: { $ne: subId },
            },
            fields: ['awardedXp'],
          },
        );
        priorAwarded = (prior ?? []).reduce((sum, r) => sum + (Number(r.awardedXp) || 0), 0);
      }

      const newXp = Math.max(0, (Number(participant?.xp) || 0) + reward - priorAwarded);
      const { level, xpToNextLevel } = levelFromXp(newXp);
      const data: Record<string, unknown> = { xp: newXp, level, xpToNextLevel };
      if (challengeId && !doneIds.includes(challengeId)) {
        data.completedChallenges = [...doneIds, challengeId];
        data.challengesClosed = (Number(participant?.challengesClosed) || 0) + 1;
      }
      await es.update('plugin::users-permissions.user', pid, { data });

      // Log the challenge completion on the review day for the activity heatmap.
      // sourceId = submission id keeps the boot backfill from duplicating it.
      await logActivity({
        userId: pid,
        teamId: sub.team?.id ?? null,
        kind: 'challenge',
        day: dayStr(new Date()),
        xp: reward,
        sourceId: subId,
      });

      // Approving a challenge may unlock badges for the participant.
      await awardBadges(pid);
    }

    ctx.body = { ok: true, status: decision, awardedXp: reward };
  };

  // ── /api/users/me/shop/purchase — participant spends XP on a shop item ─
  // Body: { shopItemId } (numeric id or slug). Spending is tracked via the
  // user's `spentXp` counter, so the balance (xp − spentXp) drops while the
  // earned XP — and therefore level/badges — stays intact. There is no
  // once-per-item limit: a participant may buy any item as long as the balance
  // covers its price. Each purchase creates a `pending` shop-order (delivery)
  // bound to the participant + their team, which their PM fulfils later.
  plugin.controllers.user.purchaseShopItem = async (ctx: any) => {
    const userId = ctx.state.user?.id;
    if (!userId) return ctx.unauthorized('not logged in');

    const body = ctx.request.body ?? {};
    const rawId = body.shopItemId ?? body.id ?? body.slug;
    if (rawId == null || rawId === '') return ctx.badRequest('shopItemId is required');

    // Accept either the numeric id or the slug the front sends.
    const numericId = Number(rawId);
    const itemFilters = Number.isInteger(numericId) && numericId > 0
      ? { id: numericId }
      : { slug: String(rawId) };
    const items: any[] = await es.findMany('api::shop-item.shop-item', {
      filters: itemFilters,
      fields: ['id', 'slug', 'title', 'image', 'tag', 'price', 'isActive'],
      limit: 1,
    });
    const item = items?.[0];
    if (!item) return ctx.badRequest('товар не найден');
    if (item.isActive === false) return ctx.badRequest('товар недоступен');

    const me: any = await es.findOne('plugin::users-permissions.user', userId, {
      fields: ['xp', 'spentXp'],
      populate: { team: { fields: ['id'] } },
    });
    const teamId = me?.team?.id ?? null;
    if (!teamId) return ctx.badRequest('сначала вступите в команду');

    const price = Math.max(0, Number(item.price) || 0);
    const xp = Number(me?.xp) || 0;
    const spentXp = Number(me?.spentXp) || 0;
    const balance = Math.max(0, xp - spentXp);
    if (balance < price) {
      return ctx.badRequest(`не хватает ${price - balance} XP`);
    }

    const newSpent = spentXp + price;
    await es.update('plugin::users-permissions.user', userId, {
      data: { spentXp: newSpent },
    });

    const order: any = await es.create('api::shop-order.shop-order', {
      data: {
        participant: userId,
        team: teamId,
        shopItem: item.id,
        itemTitle: item.title,
        itemImage: item.image ?? '',
        itemTag: item.tag ?? '',
        price,
        status: 'pending',
      },
    });

    ctx.body = {
      ok: true,
      xp,
      spentXp: newSpent,
      balance: Math.max(0, xp - newSpent),
      order: {
        id: order.id,
        itemTitle: item.title,
        itemImage: item.image ?? '',
        itemTag: item.tag ?? '',
        price,
        status: 'pending',
        createdAt: order.createdAt,
      },
    };
  };

  // ── /api/users/me/shop/orders — list shop orders (deliveries) ──────────
  // PM → every order for their managed team (grouped client-side by member).
  // Participant → only their own orders.
  plugin.controllers.user.listShopOrders = async (ctx: any) => {
    const userId = ctx.state.user?.id;
    if (!userId) return ctx.unauthorized('not logged in');

    const me: any = await es.findOne('plugin::users-permissions.user', userId, {
      fields: ['teamRole'],
      populate: { managedTeam: { fields: ['id'] } },
    });

    let filters: any;
    if (me?.teamRole === 'pm') {
      const teamId = me?.managedTeam?.id;
      if (!teamId) return (ctx.body = { data: [] });
      filters = { team: teamId };
    } else {
      filters = { participant: userId };
    }

    const rows: any[] = await es.findMany('api::shop-order.shop-order', {
      filters,
      populate: { participant: { fields: ['id', 'username', 'displayName'] } },
      sort: { createdAt: 'desc' },
      limit: 500,
    });

    const data = (rows ?? []).map((r) => ({
      id: r.id,
      status: r.status,
      itemTitle: r.itemTitle ?? '',
      itemImage: r.itemImage ?? '',
      itemTag: r.itemTag ?? '',
      price: r.price ?? 0,
      createdAt: r.createdAt,
      deliveredAt: r.deliveredAt ?? null,
      participant: r.participant
        ? { id: r.participant.id, name: r.participant.displayName || r.participant.username }
        : null,
    }));

    ctx.body = { data };
  };

  // ── /api/users/me/shop/orders/:id/deliver — PM marks a delivery received ─
  // Only the owning team's PM may fulfil; a delivered order can't be re-delivered.
  plugin.controllers.user.deliverShopOrder = async (ctx: any) => {
    const userId = ctx.state.user?.id;
    if (!userId) return ctx.unauthorized('not logged in');

    const orderId = Number(ctx.params?.id);
    if (!orderId) return ctx.badRequest('order id is required');

    const me: any = await es.findOne('plugin::users-permissions.user', userId, {
      fields: ['teamRole'],
      populate: { managedTeam: { fields: ['id'] } },
    });
    if (me?.teamRole !== 'pm') {
      return ctx.forbidden('only a project manager can fulfil deliveries');
    }

    const order: any = await es.findOne('api::shop-order.shop-order', orderId, {
      fields: ['id', 'status'],
      populate: { team: { fields: ['id'] } },
    });
    if (!order) return ctx.notFound('order not found');
    if (order.team?.id !== me?.managedTeam?.id) {
      return ctx.forbidden('эта доставка не из вашей команды');
    }
    if (order.status === 'delivered') {
      return ctx.badRequest('эта доставка уже выдана');
    }

    await es.update('api::shop-order.shop-order', orderId, {
      data: { status: 'delivered', deliveredAt: new Date() },
    });

    ctx.body = { ok: true, status: 'delivered' };
  };

  // ── /api/users/me/team — PM sees their whole team + per-member stats ───
  plugin.controllers.user.getTeam = async (ctx: any) => {
    const userId = ctx.state.user?.id;
    if (!userId) return ctx.unauthorized('not logged in');

    const me: any = await es.findOne('plugin::users-permissions.user', userId, {
      fields: ['teamRole'],
      populate: { managedTeam: { fields: ['id', 'name'] } },
    });
    if (me?.teamRole !== 'pm') {
      return ctx.forbidden('only a project manager can view their team');
    }
    if (!me?.managedTeam) return (ctx.body = { team: null, members: [] });

    const teamId = me.managedTeam.id;
    const members: any[] = await es.findMany('plugin::users-permissions.user', {
      // Exclude the PM themselves — they manage the team, they're not a player in it.
      filters: { team: teamId, id: { $ne: userId } },
      fields: [
        'id', 'username', 'displayName',
        'xp', 'level', 'challengesClosed', 'streak', 'badgesCount',
      ],
      populate: {
        avatar: { fields: ['url'] },
        completedDailyQuests: { fields: ['id'] },
      },
      sort: { xp: 'desc' },
      limit: 500,
    });

    ctx.body = {
      team: { id: me.managedTeam.id, name: me.managedTeam.name },
      members: (members ?? []).map((m) => ({
        id: m.id,
        name: m.displayName || m.username,
        username: m.username,
        xp: m.xp ?? 0,
        level: m.level ?? 1,
        challengesClosed: m.challengesClosed ?? 0,
        streak: m.streak ?? 0,
        badgesCount: m.badgesCount ?? 0,
        completedDailyCount: Array.isArray(m.completedDailyQuests) ? m.completedDailyQuests.length : 0,
        avatarUrl: m.avatar?.url ?? null,
      })),
    };
  };

  // ── /api/users/me/team/activity — per-member, per-day completion counts ─
  // Powers the GitHub-style activity heatmap. PM-only. Reads the activity-event
  // log (single source of truth): daily completions accumulate going forward,
  // challenge completions are also backfilled from historic submissions at boot.
  plugin.controllers.user.getTeamActivity = async (ctx: any) => {
    const userId = ctx.state.user?.id;
    if (!userId) return ctx.unauthorized('not logged in');

    const me: any = await es.findOne('plugin::users-permissions.user', userId, {
      fields: ['teamRole'],
      populate: { managedTeam: { fields: ['id', 'name'] } },
    });
    if (me?.teamRole !== 'pm') {
      return ctx.forbidden('only a project manager can view team activity');
    }
    if (!me?.managedTeam) return (ctx.body = { from: null, to: null, members: [] });

    const teamId = me.managedTeam.id;

    // Window: the last 53 weeks (371 days), today included.
    const WINDOW_DAYS = 371;
    const toStr = dayStr(new Date());
    const fromStr = dayStr(new Date(Date.now() - (WINDOW_DAYS - 1) * 86_400_000));

    const members: any[] = await es.findMany('plugin::users-permissions.user', {
      filters: { team: teamId, id: { $ne: userId } },
      fields: ['id', 'username', 'displayName'],
      populate: { avatar: { fields: ['url'] } },
      sort: { xp: 'desc' },
      limit: 500,
    });

    const byId = new Map<number, any>();
    for (const m of members ?? []) {
      byId.set(m.id, {
        id: m.id,
        name: m.displayName || m.username,
        username: m.username,
        avatarUrl: m.avatar?.url ?? null,
        totalChallenges: 0,
        totalDailies: 0,
        days: {} as Record<string, { challenges: number; dailies: number }>,
      });
    }

    const events: any[] = await es.findMany('api::activity-event.activity-event', {
      filters: { team: teamId, day: { $gte: fromStr, $lte: toStr } },
      fields: ['kind', 'day'],
      populate: { user: { fields: ['id'] } },
      limit: 100000,
    });
    for (const ev of events ?? []) {
      const rec = byId.get(ev.user?.id);
      if (!rec) continue;
      const day = String(ev.day).slice(0, 10);
      const cell = rec.days[day] ?? (rec.days[day] = { challenges: 0, dailies: 0 });
      if (ev.kind === 'challenge') { cell.challenges++; rec.totalChallenges++; }
      else { cell.dailies++; rec.totalDailies++; }
    }

    ctx.body = { from: fromStr, to: toStr, members: [...byId.values()] };
  };

  // ── /api/users/me/team/members/:id — PM removes a member from their team ─
  // Clears the member's `team` relation (does not delete the account). Only the
  // owning team's PM may do this, and only for someone currently in their team.
  plugin.controllers.user.removeMember = async (ctx: any) => {
    const userId = ctx.state.user?.id;
    if (!userId) return ctx.unauthorized('not logged in');

    const memberId = Number(ctx.params?.id);
    if (!memberId) return ctx.badRequest('member id is required');
    if (memberId === userId) return ctx.badRequest('нельзя удалить самого себя');

    const me: any = await es.findOne('plugin::users-permissions.user', userId, {
      fields: ['teamRole'],
      populate: { managedTeam: { fields: ['id'] } },
    });
    if (me?.teamRole !== 'pm') {
      return ctx.forbidden('only a project manager can remove members');
    }
    const teamId = me?.managedTeam?.id;
    if (!teamId) return ctx.badRequest('your team is not set yet');

    const member: any = await es.findOne('plugin::users-permissions.user', memberId, {
      fields: ['id'],
      populate: { team: { fields: ['id'] } },
    });
    if (!member || member.team?.id !== teamId) {
      return ctx.forbidden('этот участник не из вашей команды');
    }

    await es.update('plugin::users-permissions.user', memberId, {
      data: { team: null },
    });

    ctx.body = { ok: true, removed: memberId };
  };

  // ── /api/users/me/team/rename — PM renames their managed team ──────────
  plugin.controllers.user.renameTeam = async (ctx: any) => {
    const userId = ctx.state.user?.id;
    if (!userId) return ctx.unauthorized('not logged in');

    const name = String(ctx.request.body?.name ?? '').trim();
    if (!name) return ctx.badRequest('название команды обязательно');

    const me: any = await es.findOne('plugin::users-permissions.user', userId, {
      fields: ['teamRole'],
      populate: { managedTeam: { fields: ['id', 'name'] } },
    });
    if (me?.teamRole !== 'pm') {
      return ctx.forbidden('only a project manager can rename the team');
    }
    if (!me?.managedTeam) return ctx.badRequest('your team is not set yet');

    // Name must stay unique across teams (excluding our own).
    const clash: any[] = await es.findMany('api::team.team', {
      filters: { name, id: { $ne: me.managedTeam.id } },
      fields: ['id'],
      limit: 1,
    });
    if (clash?.length) {
      return ctx.throw(409, 'Команда с таким названием уже существует');
    }

    const updated: any = await es.update('api::team.team', me.managedTeam.id, {
      data: { name },
    });
    ctx.body = { ok: true, team: updated.name };
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

  // ── /api/users/me/profile-header — save current user's header customization ─
  plugin.controllers.user.setProfileHeader = async (ctx: any) => {
    const userId = ctx.state.user?.id;
    if (!userId) return ctx.unauthorized('not logged in');

    const profileHeader = normalizeProfileHeader(ctx.request.body ?? {});

    // Profile pictures are unlocked only by earning badges. Allowed = "none",
    // the starter picture, or any picture rewarded by a badge the user owns.
    // A locked picture silently falls back to "none" so the API can't be gamed.
    const me: any = await es.findOne('plugin::users-permissions.user', userId, {
      populate: { earnedBadges: { fields: ['rewardImage'] } },
    });
    const unlocked = new Set<string>(['', STARTER_PROFILE_IMAGE]);
    for (const b of me?.earnedBadges ?? []) {
      if (typeof b?.rewardImage === 'string' && b.rewardImage) unlocked.add(b.rewardImage);
    }
    if (!unlocked.has(profileHeader.image)) profileHeader.image = '';

    await es.update(
      'plugin::users-permissions.user',
      userId,
      { data: { profileHeader } },
    );

    ctx.body = { ok: true, profileHeader };
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
      path: '/users/me/profile-header',
      handler: 'user.setProfileHeader',
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
      path: '/users/me/challenges/submit',
      handler: 'user.submitChallenge',
      config: { prefix: '', policies: [] },
    },
    {
      method: 'GET',
      path: '/users/me/submissions',
      handler: 'user.listSubmissions',
      config: { prefix: '', policies: [] },
    },
    {
      method: 'POST',
      path: '/users/me/submissions/:id/review',
      handler: 'user.reviewSubmission',
      config: { prefix: '', policies: [] },
    },
    {
      method: 'POST',
      path: '/users/me/shop/purchase',
      handler: 'user.purchaseShopItem',
      config: { prefix: '', policies: [] },
    },
    {
      method: 'GET',
      path: '/users/me/shop/orders',
      handler: 'user.listShopOrders',
      config: { prefix: '', policies: [] },
    },
    {
      method: 'POST',
      path: '/users/me/shop/orders/:id/deliver',
      handler: 'user.deliverShopOrder',
      config: { prefix: '', policies: [] },
    },
    {
      method: 'GET',
      path: '/users/me/team',
      handler: 'user.getTeam',
      config: { prefix: '', policies: [] },
    },
    {
      method: 'GET',
      path: '/users/me/team/activity',
      handler: 'user.getTeamActivity',
      config: { prefix: '', policies: [] },
    },
    {
      method: 'POST',
      path: '/users/me/team/rename',
      handler: 'user.renameTeam',
      config: { prefix: '', policies: [] },
    },
    {
      method: 'DELETE',
      path: '/users/me/team/members/:id',
      handler: 'user.removeMember',
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
