import { get } from './client'

/**
 * รายละเอียดผลการเรียนรู้ — #38.
 *
 * One read, and no write: this screen owns no data. Every number on it is
 * computed from the marks #34 stored, and it is computed on the server rather
 * than here — the bands, the pass line and the sixty per cent rule are the
 * business rules the ticket cites, and a browser that worked them out itself
 * would be a second place they could be wrong.
 *
 * So the screen receives cells that already know their band, and its job is to
 * choose a colour for each one.
 */
export const getLearningDetails = (sectionId) =>
  get(`/api/teaching/sections/${sectionId}/learning-details`)
