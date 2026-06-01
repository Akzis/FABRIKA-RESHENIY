import { factories } from '@strapi/strapi'

// The quiz answer key (`correctAnswer`) must never reach the client — otherwise
// the right option could be read straight from the network tab. We strip it from
// every public read; the answer is only ever checked server-side in completeTask.
const stripAnswer = (entry: any) => {
  if (entry && typeof entry === 'object') {
    delete entry.correctAnswer
    if (entry.attributes && typeof entry.attributes === 'object') {
      delete entry.attributes.correctAnswer
    }
  }
  return entry
}

export default factories.createCoreController('api::daily-quest.daily-quest', () => ({
  async find(ctx) {
    const res = await super.find(ctx)
    if (Array.isArray(res?.data)) res.data.forEach(stripAnswer)
    return res
  },
  async findOne(ctx) {
    const res = await super.findOne(ctx)
    if (res?.data) stripAnswer(res.data)
    return res
  },
}))
