import { factories } from '@strapi/strapi'

// UID cast: generated types include this content-type only after Strapi
// regenerates them on boot, so this would otherwise fail the pre-boot tsc.
export default factories.createCoreController('api::activity-event.activity-event' as any)
