import { get } from './client'

/**
 * ผลลัพธ์การเรียนรู้รายวิชา — #36.
 *
 * One read, and no write. Every figure on the screen is computed from #34's
 * marks by `backend/routes/sectionResults.js`, for `learningDetails.js`'
 * reason: the scale, the pass line and the sixty per cent are business rules,
 * and a browser that worked them out itself would be a second place for them to
 * be wrong — one no backend test could reach.
 *
 * The years to overlay travel in the query string rather than as a second
 * request per year, so that a chart with three lines on it is one answer read
 * at one moment. Three separate reads could each be true and the picture still
 * be of no single instant, which for a screen about a trend is the whole thing
 * it is for.
 */
export const getSectionResults = (sectionId, years = []) =>
  get(
    `/api/teaching/sections/${sectionId}/results` +
      (years.length > 0 ? `?years=${years.join(',')}` : '')
  )
