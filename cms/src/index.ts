// import type { Core } from '@strapi/strapi';
import {
  seedAchievements,
  seedBadges,
  seedDaily,
  seedHero,
  seedHowSteps,
  seedLevels,
  seedRoles,
} from './seed-data'

// Content types that the landing reads from. On every boot we make sure
// the public role can `find` / `findOne` them so the unauthenticated SSR
// fetch from Nuxt succeeds.
const PUBLIC_TYPES: { uid: string; actions: ('find' | 'findOne')[] }[] = [
  { uid: 'api::hero.hero', actions: ['find', 'findOne'] },
  { uid: 'api::how-step.how-step', actions: ['find', 'findOne'] },
  { uid: 'api::challenge-level.challenge-level', actions: ['find', 'findOne'] },
  { uid: 'api::badge.badge', actions: ['find', 'findOne'] },
  { uid: 'api::achievement.achievement', actions: ['find', 'findOne'] },
  { uid: 'api::daily-quest.daily-quest', actions: ['find', 'findOne'] },
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
    'api::daily-quest.daily-quest.find',
    'api::daily-quest.daily-quest.findOne',
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

async function seedIfEmpty(strapi: any, uid: string, rows: any[]) {
  const count = await strapi.documents(uid).count({})
  if (count > 0) return
  for (const data of rows) {
    const created = await strapi.documents(uid).create({ data })
    await publishCreated(strapi, uid, created)
  }
  strapi.log.info(`[bootstrap] seeded ${rows.length} rows into ${uid}`)
}

async function seedSingleIfEmpty(strapi: any, uid: string, data: any) {
  const existing = await strapi.documents(uid).findFirst({})
  if (existing) return
  const created = await strapi.documents(uid).create({ data })
  await publishCreated(strapi, uid, created)
  strapi.log.info(`[bootstrap] seeded singleton ${uid}`)
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

    try {
      await seedSingleIfEmpty(strapi, 'api::hero.hero', seedHero)
      await seedIfEmpty(strapi, 'api::how-step.how-step', seedHowSteps)
      await seedIfEmpty(strapi, 'api::challenge-level.challenge-level', seedLevels)
      await seedIfEmpty(strapi, 'api::badge.badge', seedBadges)
      await seedIfEmpty(strapi, 'api::achievement.achievement', seedAchievements)
      await seedIfEmpty(strapi, 'api::daily-quest.daily-quest', seedDaily)
      await seedIfEmpty(strapi, 'api::role-card.role-card', seedRoles)
    } catch (e: any) {
      strapi.log.warn(`[bootstrap] seeding failed: ${e?.message ?? e}`)
    }
  },
}
