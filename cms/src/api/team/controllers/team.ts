import { factories } from '@strapi/strapi'

// UID cast: the generated types include `api::team.team` only after Strapi
// regenerates them on boot, so this would otherwise fail the pre-boot tsc.
export default factories.createCoreController('api::team.team' as any)
