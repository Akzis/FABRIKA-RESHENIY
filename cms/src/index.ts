// import type { Core } from '@strapi/strapi';
import {
  seedBadges,
  seedChallenges,
  seedDaily,
  seedHero,
  seedHowSteps,
  seedLevels,
  seedRoles,
  seedShopItems,
} from './seed-data'

// Content types that the landing reads from. On every boot we make sure
// the public role can `find` / `findOne` them so the unauthenticated SSR
// fetch from Nuxt succeeds.
const PUBLIC_TYPES: { uid: string; actions: ('find' | 'findOne')[] }[] = [
  { uid: 'api::hero.hero', actions: ['find', 'findOne'] },
  { uid: 'api::how-step.how-step', actions: ['find', 'findOne'] },
  { uid: 'api::challenge-level.challenge-level', actions: ['find', 'findOne'] },
  { uid: 'api::badge.badge', actions: ['find', 'findOne'] },
  { uid: 'api::daily-quest.daily-quest', actions: ['find', 'findOne'] },
  { uid: 'api::challenge.challenge', actions: ['find', 'findOne'] },
  { uid: 'api::shop-item.shop-item', actions: ['find', 'findOne'] },
  { uid: 'api::role-card.role-card', actions: ['find', 'findOne'] },
]

async function grantActions(strapi: any, roleType: 'public' | 'authenticated', actions: string[]) {
  const roleService = strapi.service('plugin::users-permissions.role')
  const roles = await roleService.find()
  const role = roles.find((r: any) => r.type === roleType)
  if (!role) return

  const existing = await strapi.db
    .query('plugin::users-permissions.permission')
    .findMany({ where: { role: role.id } })
  const existingActions = new Set(existing.map((p: any) => p.action))

  for (const action of actions) {
    if (existingActions.has(action)) continue
    await strapi.db.query('plugin::users-permissions.permission').create({
      data: { action, role: role.id },
    })
    strapi.log.info(`[bootstrap] granted ${roleType} ${action}`)
  }
}

async function grantPublicRead(strapi: any) {
  const actions: string[] = []
  for (const { uid, actions: acts } of PUBLIC_TYPES) {
    for (const a of acts) actions.push(`${uid}.${a}`)
  }
  await grantActions(strapi, 'public', actions)
}

async function grantAuthenticatedSelf(strapi: any) {
  // - /me + own daily quests
  // - read other users (filtered by teamRole=member) to build leaderboard.
  //   Sensitive fields (password, tokens) are stripped by users-permissions
  //   by default; we still narrow output with `fields` on the front side.
  await grantActions(strapi, 'authenticated', [
    'plugin::users-permissions.user.me',
    'plugin::users-permissions.user.find',
    'plugin::users-permissions.user.setRole',
    'plugin::users-permissions.user.setAvatar',
    'plugin::users-permissions.user.setProfileHeader',
    'plugin::users-permissions.user.completeTask',
    'plugin::users-permissions.user.submitChallenge',
    'plugin::users-permissions.user.listSubmissions',
    'plugin::users-permissions.user.reviewSubmission',
    'plugin::users-permissions.user.getTeam',
    'plugin::users-permissions.user.renameTeam',
    'plugin::users-permissions.user.removeMember',
    'plugin::users-permissions.user.createInvite',
    'plugin::users-permissions.user.joinTeam',
    'api::daily-quest.daily-quest.find',
    'api::daily-quest.daily-quest.findOne',
    // teams count for the hero stats (total number of teams)
    'api::team.team.find',
  ])
}

async function publishCreated(strapi: any, uid: string, doc: any) {
  // Strapi v5: create() makes a draft; publish() materialises the published
  // version that public find/findOne return.
  if (!doc?.documentId) return
  try {
    await strapi.documents(uid).publish({ documentId: doc.documentId })
  } catch (e: any) {
    strapi.log.warn(`[bootstrap] publish failed for ${uid}/${doc.documentId}: ${e?.message ?? e}`)
  }
}

// True only when the content-type actually exists in this build. Guards the
// seeders so a stale UID (e.g. a removed `api::hero.hero`) is skipped instead
// of throwing and aborting every later seed.
function hasType(strapi: any, uid: string): boolean {
  return !!strapi.contentTypes?.[uid]
}

async function seedIfEmpty(strapi: any, uid: string, rows: any[]) {
  if (!hasType(strapi, uid)) {
    strapi.log.warn(`[bootstrap] skip seeding ${uid}: content-type not found`)
    return
  }
  const count = await strapi.documents(uid).count({})
  if (count > 0) return
  for (const data of rows) {
    const created = await strapi.documents(uid).create({ data })
    await publishCreated(strapi, uid, created)
  }
  strapi.log.info(`[bootstrap] seeded ${rows.length} rows into ${uid}`)
}

async function seedSingleIfEmpty(strapi: any, uid: string, data: any) {
  if (!hasType(strapi, uid)) {
    strapi.log.warn(`[bootstrap] skip seeding ${uid}: content-type not found`)
    return
  }
  const existing = await strapi.documents(uid).findFirst({})
  if (existing) return
  const created = await strapi.documents(uid).create({ data })
  await publishCreated(strapi, uid, created)
  strapi.log.info(`[bootstrap] seeded singleton ${uid}`)
}

// Badges seeded before rewards existed have empty xpReward/rewardImage. Backfill
// those (matched by `code`) so the reward system works without a manual re-seed.
// Only fills blanks — deliberate admin edits to a non-zero reward are preserved.
async function backfillBadgeRewards(strapi: any) {
  if (!hasType(strapi, 'api::badge.badge')) return
  for (const seed of seedBadges as any[]) {
    if (!seed.code) continue
    const rows = await strapi.documents('api::badge.badge').findMany({
      filters: { code: seed.code }, limit: 1,
    })
    const badge = rows?.[0]
    if (!badge) continue
    const needsImage = !badge.rewardImage && seed.rewardImage
    const needsXp = !Number(badge.xpReward) && Number(seed.xpReward)
    if (!needsImage && !needsXp) continue
    const updated = await strapi.documents('api::badge.badge').update({
      documentId: badge.documentId,
      data: {
        ...(needsImage ? { rewardImage: seed.rewardImage } : {}),
        ...(needsXp ? { xpReward: seed.xpReward } : {}),
      },
    })
    await publishCreated(strapi, 'api::badge.badge', updated)
    strapi.log.info(`[bootstrap] backfilled rewards for badge ${seed.code}`)
  }
}

export default {
  /**
   * An asynchronous register function that runs before
   * your application is initialized.
   */
  register(/* { strapi }: { strapi: Core.Strapi } */) {},

  /**
   * An asynchronous bootstrap function that runs before
   * your application gets started.
   *
   * - grants public read on landing content types so the front can fetch
   *   without auth
   * - seeds reasonable defaults so the landing is never blank in dev
   */
  async bootstrap({ strapi }: { strapi: any }) {
    try {
      await grantPublicRead(strapi)
      await grantAuthenticatedSelf(strapi)
    } catch (e: any) {
      strapi.log.warn(`[bootstrap] could not grant permissions: ${e?.message ?? e}`)
    }

    // Each seed is isolated so one failure (or a removed content-type) doesn't
    // block the others — challenges in particular must always get a chance to seed.
    const seeds: Array<() => Promise<void>> = [
      () => seedSingleIfEmpty(strapi, 'api::hero.hero', seedHero),
      () => seedIfEmpty(strapi, 'api::how-step.how-step', seedHowSteps),
      () => seedIfEmpty(strapi, 'api::challenge-level.challenge-level', seedLevels),
      () => seedIfEmpty(strapi, 'api::badge.badge', seedBadges),
      () => seedIfEmpty(strapi, 'api::daily-quest.daily-quest', seedDaily),
      () => seedIfEmpty(strapi, 'api::challenge.challenge', seedChallenges),
      () => seedIfEmpty(strapi, 'api::shop-item.shop-item', seedShopItems),
      () => seedIfEmpty(strapi, 'api::role-card.role-card', seedRoles),
    ]
    try {
      for (const run of seeds) {
        try { await run() } catch (e: any) {
          strapi.log.warn(`[bootstrap] a seed failed: ${e?.message ?? e}`)
        }
      }
    } catch (e: any) {
      strapi.log.warn(`[bootstrap] seeding failed: ${e?.message ?? e}`)
    }

    try { await backfillBadgeRewards(strapi) } catch (e: any) {
      strapi.log.warn(`[bootstrap] badge reward backfill failed: ${e?.message ?? e}`)
    }
  },
}
