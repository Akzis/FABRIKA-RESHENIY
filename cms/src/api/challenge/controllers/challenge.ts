import { factories } from '@strapi/strapi'

// UID cast: generated types include `api::challenge.challenge` only after
// Strapi regenerates them on boot, so this would otherwise fail the pre-boot tsc.
export default factories.createCoreController('api::challenge.challenge' as any)
